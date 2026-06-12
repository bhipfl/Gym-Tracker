#!/usr/bin/env node
/**
 * Einmalige Migration der Google-Sheets-Daten nach Supabase.
 *
 * Vorbereitung:
 *  1. Im Google Sheet jeden Tab exportieren: Datei → Herunterladen → CSV.
 *     Erwartete Dateien in einem Ordner:
 *       Plans.csv, Exercises.csv, Plan_Exercises.csv, Sessions.csv, Sets.csv
 *  2. In Supabase den Ziel-User anlegen (Coach-Account) und dessen UUID notieren
 *     (Dashboard → Authentication → Users).
 *
 * Ausführen (lokal, mit Service-Role-Key):
 *   SUPABASE_URL=https://xyz.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   TARGET_USER_ID=<uuid-des-coach-accounts> \
 *   node scripts/migrate-sheets.mjs ./pfad/zu/den/csvs
 *
 * Die UUIDs aus den Sheets bleiben erhalten (Apps Script nutzte bereits UUIDs),
 * daher bleiben alle Fremdschlüssel-Beziehungen intakt.
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const userId = process.env.TARGET_USER_ID
const dir = process.argv[2]
if (!url || !key || !userId || !dir) {
  console.error('Benötigt: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TARGET_USER_ID und CSV-Ordner als Argument.')
  process.exit(1)
}
const supabase = createClient(url, key)

// Minimaler CSV-Parser (unterstützt Anführungszeichen + Kommas in Feldern)
function parseCsv(text) {
  const rows = []
  let row = [], field = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') inQuotes = false
      else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some(f => f !== '')) rows.push(row)
      row = []
    } else field += c
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  const [header, ...data] = rows
  return data.map(r => Object.fromEntries(header.map((h, i) => [h.trim(), r[i] ?? ''])))
}

const nul = (v) => (v === '' || v == null ? null : v)
// Sheets kann Komma-Dezimalzahlen enthalten ("80,5")
const num = (v) => {
  if (v === '' || v == null) return null
  const n = parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
const int = (v) => {
  const n = num(v)
  return n == null ? null : Math.round(n)
}
const iso = (v) => {
  if (!v) return null
  const d = new Date(v)
  return isNaN(d) ? null : d.toISOString()
}

async function loadCsv(name) {
  try {
    return parseCsv(await readFile(path.join(dir, name), 'utf8'))
  } catch {
    console.warn(`  ${name} nicht gefunden — übersprungen.`)
    return []
  }
}

async function insertBatch(table, rows) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from(table).upsert(rows.slice(i, i + 500))
    if (error) throw new Error(`${table}: ${error.message}`)
  }
  const { count } = await supabase.from(table).select('*', { count: 'exact', head: true })
  console.log(`  ${table}: ${rows.length} migriert, ${count} gesamt in Supabase`)
}

async function main() {
  console.log('Lese CSVs...')
  const [plans, exercises, planExercises, sessions, sets] = await Promise.all([
    loadCsv('Plans.csv'), loadCsv('Exercises.csv'), loadCsv('Plan_Exercises.csv'),
    loadCsv('Sessions.csv'), loadCsv('Sets.csv'),
  ])
  console.log(`Plans=${plans.length} Exercises=${exercises.length} Plan_Exercises=${planExercises.length} Sessions=${sessions.length} Sets=${sets.length}\n`)

  // Übungen zuerst (FK-Ziel). Eigene Übungen gehören dem migrierten User.
  await insertBatch('exercises', exercises.map(e => ({
    id: e.id,
    owner_id: userId,
    name_de: e.name,
    muscle_group: nul(e.muscle_group),
  })))

  const exerciseIds = new Set(exercises.map(e => e.id))
  const planIds = new Set(plans.map(p => p.id))

  await insertBatch('plans', plans.map(p => ({
    id: p.id,
    owner_id: userId,
    client_id: null,
    name: p.name || 'Plan',
    description: nul(p.description),
    created_at: iso(p.created_at) || new Date().toISOString(),
  })))

  await insertBatch('plan_exercises', planExercises
    .filter(pe => planIds.has(pe.plan_id))
    .map(pe => ({
      id: pe.id,
      plan_id: pe.plan_id,
      exercise_id: exerciseIds.has(pe.exercise_id) ? pe.exercise_id : null,
      exercise_name: pe.exercise_name,
      default_sets: int(pe.default_sets) ?? 3,
      position: int(pe.order) ?? 0,
    })))

  await insertBatch('sessions', sessions.map(s => ({
    id: s.id,
    user_id: userId,
    plan_id: planIds.has(s.plan_id) ? s.plan_id : null,
    plan_name: nul(s.plan_name),
    date: iso(s.date) || new Date().toISOString(),
    notes: nul(s.notes),
    completed: String(s.completed).toLowerCase() !== 'false',
  })))

  const sessionIds = new Set(sessions.map(s => s.id))
  await insertBatch('sets', sets
    .filter(st => sessionIds.has(st.session_id))
    .map(st => ({
      id: st.id,
      session_id: st.session_id,
      exercise_id: exerciseIds.has(st.exercise_id) ? st.exercise_id : null,
      exercise_name: st.exercise_name,
      set_number: int(st.set_number),
      weight: num(st.weight),
      reps: int(st.reps),
    })))

  console.log('\nMigration abgeschlossen. Stichproben in der App prüfen (Verlauf, Fortschritt, letzte Gewichte).')
}

main().catch((e) => { console.error('\nFehler:', e.message); process.exit(1) })
