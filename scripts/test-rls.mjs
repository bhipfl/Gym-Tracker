#!/usr/bin/env node
/**
 * RLS-Sicherheitstest: prüft die Zugriffs-Matrix der Coach-Plattform
 * mit drei frischen Test-Accounts gegen die echte Datenbank.
 *
 *   Coach A  – hat einen Plan, lädt Klient C ein
 *   Coach B  – fremder Coach, darf nichts von A/C sehen
 *   Klient C – Klient von A, trackt eigene Trainings
 *
 * Ausführen (lokal):
 *   SUPABASE_URL=https://xyz.supabase.co \
 *   SUPABASE_ANON_KEY=sb_publishable_... \
 *   SUPABASE_SERVICE_ROLE_KEY=sb_secret_... \
 *   node scripts/test-rls.mjs
 *
 * Voraussetzung: "Confirm email" ist deaktiviert (Signup liefert direkt eine Session).
 * Die Test-User (…@example.com) werden am Ende wieder gelöscht (Cascade räumt
 * Profile, Pläne, Sessions, Einladungen und Notizen mit ab).
 */
import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL
const ANON = process.env.SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !ANON || !SERVICE) {
  console.error('SUPABASE_URL, SUPABASE_ANON_KEY und SUPABASE_SERVICE_ROLE_KEY setzen.')
  process.exit(1)
}

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })
const ts = Date.now()
const PASSWORD = `Rls-Test-${ts}!`

let failures = 0
function check(name, ok, detail = '') {
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  [${detail}]` : ''}`)
}

const newAnon = () => createClient(URL, ANON, { auth: { persistSession: false } })

// Wie createInvitation() in src/services/api.js: Code clientseitig erzeugen
function inviteCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function signUp(label, role) {
  const client = newAnon()
  const email = `rls-${label}-${ts}@example.com`
  const { data, error } = await client.auth.signUp({
    email,
    password: PASSWORD,
    options: { data: { role, display_name: `RLS ${label.toUpperCase()}` } },
  })
  if (error) throw new Error(`Signup ${label}: ${error.message}`)
  if (!data.session) throw new Error(`Signup ${label}: keine Session — ist "Confirm email" noch aktiv?`)
  return { client, id: data.user.id, email }
}

async function main() {
  console.log('Lege Test-Accounts an...')
  const A = await signUp('coach-a', 'coach')
  const B = await signUp('coach-b', 'coach')
  const C = await signUp('client-c', 'client')
  const ids = [A.id, B.id, C.id]
  console.log(`A=${A.id}\nB=${B.id}\nC=${C.id}\n`)

  try {
    // ---------- Setup: A erstellt Plan-Template + Einladung ----------
    const { data: planA, error: planErr } = await A.client
      .from('plans').insert({ owner_id: A.id, name: 'RLS Testplan' }).select().single()
    if (planErr) throw new Error(`Plan-Anlage A: ${planErr.message}`)
    await A.client.from('plan_exercises').insert({
      plan_id: planA.id, exercise_name: 'RLS Bankdrücken', default_sets: 3, position: 0,
    })

    const { data: inv1, error: invErr } = await A.client
      .from('invitations').insert({ coach_id: A.id, code: inviteCode() }).select().single()
    if (invErr) throw new Error(`Einladung A: ${invErr.message}`)

    // ---------- Einladungs-Flow ----------
    const { error: accErr } = await C.client.rpc('accept_invitation', { invite_code: inv1.code })
    check('C nimmt gültige Einladung an', !accErr, accErr?.message)

    const { data: link } = await C.client.from('coach_clients').select('*')
    check('coach_clients-Verknüpfung A↔C existiert (für C sichtbar)',
      link?.length === 1 && link[0].coach_id === A.id)

    const { error: reuseErr } = await B.client.rpc('accept_invitation', { invite_code: inv1.code })
    check('Bereits genutzter Code wird abgelehnt (B)', !!reuseErr, reuseErr?.message)

    const { data: inv2 } = await A.client.from('invitations').insert({ coach_id: A.id, code: inviteCode() }).select().single()
    await admin.from('invitations').update({ expires_at: new Date(Date.now() - 60_000).toISOString() }).eq('id', inv2.id)
    const { error: expErr } = await B.client.rpc('accept_invitation', { invite_code: inv2.code })
    check('Abgelaufener Code wird abgelehnt (B)', !!expErr, expErr?.message)

    const { data: inv3 } = await A.client.from('invitations').insert({ coach_id: A.id, code: inviteCode() }).select().single()
    const { error: selfErr } = await A.client.rpc('accept_invitation', { invite_code: inv3.code })
    check('Eigene Einladung kann nicht angenommen werden (A)', !!selfErr, selfErr?.message)

    const { data: bLinks } = await B.client.from('coach_clients').select('*')
    check('B ist nach abgelehnten Versuchen mit niemandem verknüpft', bLinks?.length === 0)

    // ---------- Plan-Zuweisung ----------
    const { data: assignedId, error: assignErr } = await A.client
      .rpc('assign_plan_to_client', { p_plan_id: planA.id, p_client_id: C.id })
    check('A weist C eine Plan-Kopie zu (RPC)', !assignErr && !!assignedId, assignErr?.message)

    const { error: bAssignErr } = await B.client
      .rpc('assign_plan_to_client', { p_plan_id: planA.id, p_client_id: C.id })
    check('B kann fremden Klienten KEINEN Plan zuweisen', !!bAssignErr, bAssignErr?.message)

    // ---------- Pläne: Sichtbarkeit ----------
    const { data: cPlans } = await C.client.from('plans').select('id')
    check('C sieht genau 1 Plan (die zugewiesene Kopie)',
      cPlans?.length === 1 && cPlans[0].id === assignedId)

    const { data: cTemplate } = await C.client.from('plans').select('id').eq('id', planA.id)
    check('C sieht As Original-Template NICHT', cTemplate?.length === 0)

    const { data: cPlanEx } = await C.client.from('plan_exercises').select('*').eq('plan_id', assignedId)
    check('C liest Übungen seines zugewiesenen Plans', cPlanEx?.length === 1)

    const { data: cPlanWrite } = await C.client.from('plan_exercises')
      .insert({ plan_id: assignedId, exercise_name: 'Schummel-Übung', position: 9 }).select()
    check('C kann den Coach-Plan NICHT verändern', !cPlanWrite || cPlanWrite.length === 0)

    const { data: bPlans } = await B.client.from('plans').select('id')
    check('B sieht keinerlei Pläne von A/C', bPlans?.length === 0)

    // ---------- Sessions & Sets ----------
    const { data: cSession, error: cSessErr } = await C.client
      .from('sessions')
      .insert({ user_id: C.id, plan_id: assignedId, plan_name: 'RLS Testplan', date: new Date().toISOString() })
      .select().single()
    check('C legt eigene Session an', !cSessErr, cSessErr?.message)

    const { error: cSetErr } = await C.client.from('sets').insert({
      session_id: cSession.id, exercise_name: 'RLS Bankdrücken', set_number: 1, weight: 80.5, reps: 8,
    })
    check('C loggt eigenen Satz', !cSetErr, cSetErr?.message)

    const { error: spoofErr } = await C.client.from('sessions')
      .insert({ user_id: A.id, date: new Date().toISOString() })
    check('C kann KEINE Session für fremden User anlegen', !!spoofErr, spoofErr?.message)

    const { data: aSeesSessions } = await A.client.from('sessions').select('id, user_id').eq('user_id', C.id)
    check('A (Coach) liest Cs Sessions', aSeesSessions?.length === 1)

    const { data: aSeesSets } = await A.client.from('sets').select('weight').eq('session_id', cSession.id)
    check('A (Coach) liest Cs Sätze inkl. Dezimalgewicht',
      aSeesSets?.length === 1 && Number(aSeesSets[0].weight) === 80.5)

    const { data: aUpd } = await A.client.from('sessions')
      .update({ notes: 'hacked by coach' }).eq('id', cSession.id).select()
    check('A kann Cs Session NICHT ändern (read-only)', !aUpd || aUpd.length === 0)

    const { data: aDel } = await A.client.from('sessions').delete().eq('id', cSession.id).select()
    const { data: stillThere } = await C.client.from('sessions').select('id').eq('id', cSession.id)
    check('A kann Cs Session NICHT löschen', (!aDel || aDel.length === 0) && stillThere?.length === 1)

    const { data: aSetUpd } = await A.client.from('sets')
      .update({ weight: 999 }).eq('session_id', cSession.id).select()
    check('A kann Cs Sätze NICHT ändern', !aSetUpd || aSetUpd.length === 0)

    const { error: aSpoofSet } = await B.client.from('sets').insert({
      session_id: cSession.id, exercise_name: 'Fremdsatz', set_number: 1, weight: 1, reps: 1,
    })
    check('B kann KEINEN Satz in Cs Session schreiben', !!aSpoofSet, aSpoofSet?.message)

    const { data: bSessions } = await B.client.from('sessions').select('id')
    check('B sieht keinerlei Sessions', bSessions?.length === 0)

    // ---------- Profile ----------
    const { data: aProfiles } = await A.client.from('profiles').select('id')
    check('A sieht genau 2 Profile (sich + Klient C)',
      aProfiles?.length === 2 && aProfiles.some((p) => p.id === C.id))

    const { data: cProfiles } = await C.client.from('profiles').select('id, role')
    check('C sieht genau 2 Profile (sich + Coach A)',
      cProfiles?.length === 2 && cProfiles.some((p) => p.id === A.id))
    check('Cs Rolle ist nach Einladung "client"',
      cProfiles?.find((p) => p.id === C.id)?.role === 'client')

    const { data: bProfiles } = await B.client.from('profiles').select('id')
    check('B sieht nur das eigene Profil', bProfiles?.length === 1 && bProfiles[0].id === B.id)

    // ---------- Akte (client_notes) ----------
    const { error: noteErr } = await A.client.from('client_notes')
      .insert({ coach_id: A.id, client_id: C.id, note: 'Knie schonen' })
    check('A legt Akten-Notiz über C an', !noteErr, noteErr?.message)

    const { data: cNotes } = await C.client.from('client_notes').select('*')
    check('C sieht die Coach-Notizen über sich NICHT', cNotes?.length === 0)

    const { data: bNotes } = await B.client.from('client_notes').select('*')
    check('B sieht keine fremden Notizen', bNotes?.length === 0)

    const { error: bNoteErr } = await B.client.from('client_notes')
      .insert({ coach_id: B.id, client_id: C.id, note: 'fremde Akte' })
    check('B kann KEINE Notiz über fremden Klienten anlegen', !!bNoteErr, bNoteErr?.message)

    // ---------- Übungen ----------
    const { data: cEx, error: cExErr } = await C.client.from('exercises')
      .insert({ owner_id: C.id, name_de: 'RLS Eigenübung C' }).select().single()
    check('C legt eigene Übung an', !cExErr, cExErr?.message)

    const { data: aSeesCEx } = await A.client.from('exercises').select('id').eq('id', cEx.id)
    check('A (Coach) sieht Cs eigene Übung', aSeesCEx?.length === 1)

    const { data: bSeesCEx } = await B.client.from('exercises').select('id').eq('id', cEx.id)
    check('B sieht Cs Übung NICHT', bSeesCEx?.length === 0)

    const { data: bGlobal } = await B.client.from('exercises').select('id').is('owner_id', null).limit(1)
    check('Globale wger-Übungen sind für alle lesbar (sofern geseedet)', bGlobal !== null,
      `${bGlobal?.length ?? 0} gefunden`)

    // ---------- Anonymer Zugriff ----------
    const anon = newAnon()
    const [{ data: anonSess }, { data: anonProf }, { data: anonPlans }] = await Promise.all([
      anon.from('sessions').select('id'),
      anon.from('profiles').select('id'),
      anon.from('plans').select('id'),
    ])
    check('Anonym (ohne Login): keine Sessions/Profile/Pläne lesbar',
      anonSess?.length === 0 && anonProf?.length === 0 && anonPlans?.length === 0)
  } finally {
    console.log('\nRäume Test-Accounts auf...')
    for (const id of ids) {
      const { error } = await admin.auth.admin.deleteUser(id)
      if (error) console.warn(`  Konnte User ${id} nicht löschen: ${error.message}`)
    }
    const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).in('id', ids)
    console.log(count === 0 ? 'Aufgeräumt — keine Test-Daten übrig.' : `WARNUNG: ${count} Test-Profile übrig!`)
  }

  console.log(`\n${failures === 0 ? 'ALLE CHECKS BESTANDEN ✔' : `${failures} CHECK(S) FEHLGESCHLAGEN ✘`}`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => { console.error('\nAbbruch:', e.message); process.exit(1) })
