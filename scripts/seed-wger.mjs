#!/usr/bin/env node
/**
 * Seedet die globale Übungstabelle in Supabase aus der lokal gebauten
 * wger-Datenbank (erst `node scripts/build-exercise-db.mjs` ausführen).
 *
 * Bilder werden in den public Storage-Bucket `exercise-images` hochgeladen
 * (kein Hotlinking auf wger.de), die Übungen in `exercises` mit
 * owner_id = null (global) eingefügt.
 *
 * Ausführen (lokal, mit Service-Role-Key — NIE in den Client einbauen):
 *   SUPABASE_URL=https://xyz.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   node scripts/seed-wger.mjs
 */
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY als Env-Variablen setzen.')
  process.exit(1)
}
const supabase = createClient(url, key)

const CONTENT_TYPES = { '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif' }

async function main() {
  const entries = JSON.parse(await readFile(path.join(ROOT, 'src', 'data', 'exercises.de.json'), 'utf8'))
  if (entries.length === 0) {
    console.error('exercises.de.json ist leer — erst scripts/build-exercise-db.mjs ausführen.')
    process.exit(1)
  }
  console.log(`${entries.length} Übungen werden geseedet...`)

  let ok = 0
  for (const ex of entries) {
    const localPath = path.join(ROOT, 'public', ex.image)
    const fileName = path.basename(ex.image)
    const ext = path.extname(fileName).toLowerCase()

    const buf = await readFile(localPath)
    const { error: upErr } = await supabase.storage
      .from('exercise-images')
      .upload(fileName, buf, { contentType: CONTENT_TYPES[ext] || 'application/octet-stream', upsert: true })
    if (upErr) {
      console.warn(`  Upload fehlgeschlagen (${ex.name}): ${upErr.message}`)
      continue
    }
    const { data: pub } = supabase.storage.from('exercise-images').getPublicUrl(fileName)

    const { error: insErr } = await supabase.from('exercises').upsert({
      owner_id: null,
      wger_id: ex.id,
      name_de: ex.name,
      muscle_group: ex.muscle || null,
      image_url: pub.publicUrl,
      license: ex.license,
      license_author: ex.author,
    }, { onConflict: 'wger_id' })
    if (insErr) {
      console.warn(`  Insert fehlgeschlagen (${ex.name}): ${insErr.message}`)
      continue
    }
    ok++
    process.stdout.write(`\r${ok}/${entries.length} fertig...`)
  }
  console.log(`\nFertig: ${ok} Übungen geseedet.`)
}

main().catch((e) => { console.error('\nFehler:', e.message); process.exit(1) })
