// API-Layer auf Supabase. Exportiert dieselben Funktionsnamen/-signaturen
// wie der frühere Apps-Script-Client, damit die Query-Hooks unverändert bleiben.
import { supabase, currentUserId } from '../lib/supabase.js'

const nul = (v) => (v === '' || v == null ? null : v)
// Eingaben können Komma-Dezimalzahlen sein ("80,5")
const num = (v) => {
  if (v === '' || v == null) return null
  const n = parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
const int = (v) => {
  const n = num(v)
  return n == null ? null : Math.round(n)
}

function throwIf(error) {
  if (error) throw new Error(error.message)
}

// Supabase verpackt Netzwerkfehler in ein Error-Objekt statt einen TypeError
// zu werfen — für die Offline-Queue brauchen wir eine robuste Erkennung.
export function isNetworkError(err) {
  if (err instanceof TypeError) return true
  return /failed to fetch|network|load failed/i.test(err?.message || '')
}

export async function testConnection() {
  const { error } = await supabase.from('profiles').select('id', { head: true, count: 'exact' })
  throwIf(error)
  return { ok: true }
}

// ---------- Pläne ----------

// Sichtbar: eigene Templates (client_id null) + mir zugewiesene Pläne.
// Zugewiesene Kopien der eigenen Kunden tauchen hier bewusst NICHT auf —
// die verwaltet der Coach in der Kundenakte.
export async function getPlans() {
  const uid = await currentUserId()
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .or(`and(owner_id.eq.${uid},client_id.is.null),client_id.eq.${uid}`)
    .order('created_at', { ascending: true })
  throwIf(error)
  return data
}

export async function savePlan(plan) {
  const uid = await currentUserId()
  const row = {
    name: plan.name,
    description: nul(plan.description),
  }
  if (plan.id && !String(plan.id).startsWith('tmp-')) {
    const { data, error } = await supabase.from('plans').update(row).eq('id', plan.id).select().single()
    throwIf(error)
    return data
  }
  const { data, error } = await supabase
    .from('plans')
    .insert({ ...row, owner_id: uid, client_id: plan.client_id || null })
    .select()
    .single()
  throwIf(error)
  return data
}

export async function deletePlan(id) {
  const { error } = await supabase.from('plans').delete().eq('id', id)
  throwIf(error)
  return { ok: true }
}

// ---------- Plan-Übungen ----------

function flattenPlanExercise(row) {
  return {
    ...row,
    muscle_group: row.muscle_group ?? row.exercises?.muscle_group ?? '',
    image_url: row.exercises?.image_url ?? null,
    order: row.position,
    exercises: undefined,
  }
}

export async function getPlanExercises(planId) {
  const { data, error } = await supabase
    .from('plan_exercises')
    .select('*, exercises(muscle_group, image_url)')
    .eq('plan_id', planId)
    .order('position', { ascending: true })
  throwIf(error)
  return data.map(flattenPlanExercise)
}

// Findet oder erstellt die Übung (eigene oder globale) und hängt sie an den Plan.
export async function addExerciseToPlan(planId, exercise) {
  const uid = await currentUserId()
  let exerciseId = nul(exercise.exercise_id)

  if (!exerciseId) {
    const name = exercise.exercise_name.trim()
    const { data: existing, error: findErr } = await supabase
      .from('exercises')
      .select('id')
      .ilike('name_de', name)
      .limit(1)
    throwIf(findErr)
    if (existing?.length) {
      exerciseId = existing[0].id
    } else {
      const { data: created, error: createErr } = await supabase
        .from('exercises')
        .insert({ owner_id: uid, name_de: name, muscle_group: nul(exercise.muscle_group) })
        .select('id')
        .single()
      throwIf(createErr)
      exerciseId = created.id
    }
  }

  const { count } = await supabase
    .from('plan_exercises')
    .select('id', { head: true, count: 'exact' })
    .eq('plan_id', planId)

  const { data, error } = await supabase
    .from('plan_exercises')
    .insert({
      plan_id: planId,
      exercise_id: exerciseId,
      exercise_name: exercise.exercise_name.trim(),
      default_sets: int(exercise.default_sets) ?? 3,
      position: count ?? 0,
    })
    .select()
    .single()
  throwIf(error)
  return data
}

// exerciseId ist die plan_exercises-Zeilen-ID (wie beim alten Backend)
export async function removeExerciseFromPlan(planId, exerciseId) {
  const { error } = await supabase.from('plan_exercises').delete().eq('id', exerciseId)
  throwIf(error)
  return { ok: true }
}

export async function updatePlanExercise(planId, exerciseId, updates) {
  const row = {}
  if (updates.default_sets != null) row.default_sets = int(updates.default_sets)
  const { error } = await supabase.from('plan_exercises').update(row).eq('id', exerciseId)
  throwIf(error)
  return { ok: true }
}

export async function reorderPlanExercises(updates) {
  for (const u of updates) {
    const { error } = await supabase.from('plan_exercises').update({ position: u.order }).eq('id', u.id)
    throwIf(error)
  }
  return { ok: true }
}

// ---------- Übungen ----------

export async function searchExercises(q) {
  const { data, error } = await supabase
    .from('exercises')
    .select('id, name_de, muscle_group')
    .ilike('name_de', `%${q}%`)
    .order('name_de')
    .limit(20)
  throwIf(error)
  return data.map((e) => ({ id: e.id, name: e.name_de, muscle_group: e.muscle_group || '' }))
}

export async function getUsedExerciseNames(userId) {
  const uid = userId || (await currentUserId())
  const { data, error } = await supabase
    .from('sets')
    .select('exercise_name, sessions!inner(user_id)')
    .eq('sessions.user_id', uid)
  throwIf(error)
  return [...new Set(data.map((s) => s.exercise_name))].sort((a, b) => a.localeCompare(b, 'de'))
}

// ---------- Sessions ----------

export async function getSessions(limit = 50, userId) {
  const uid = userId || (await currentUserId())
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', uid)
    .order('date', { ascending: false })
    .limit(limit)
  throwIf(error)
  return data
}

function buildSetRows(sessionId, sets) {
  return (sets || []).map((s) => ({
    session_id: sessionId,
    exercise_id: nul(s.exercise_id),
    exercise_name: s.exercise_name,
    set_number: int(s.set_number),
    weight: num(s.weight),
    reps: int(s.reps),
  }))
}

export async function saveSession(session) {
  const uid = await currentUserId()
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: uid,
      plan_id: nul(session.plan_id),
      plan_name: nul(session.plan_name),
      date: session.date,
      notes: nul(session.notes),
      completed: true,
    })
    .select('id')
    .single()
  throwIf(error)

  const rows = buildSetRows(data.id, session.sets)
  if (rows.length) {
    const { error: setsErr } = await supabase.from('sets').insert(rows)
    throwIf(setsErr)
  }
  return { ok: true, sessionId: data.id }
}

export async function updateSession(session) {
  const { error } = await supabase
    .from('sessions')
    .update({ notes: nul(session.notes), date: session.date })
    .eq('id', session.session_id)
  throwIf(error)

  const { error: delErr } = await supabase.from('sets').delete().eq('session_id', session.session_id)
  throwIf(delErr)

  const rows = buildSetRows(session.session_id, session.sets)
  if (rows.length) {
    const { error: insErr } = await supabase.from('sets').insert(rows)
    throwIf(insErr)
  }
  return { ok: true }
}

export async function deleteSession(id) {
  const { error } = await supabase.from('sessions').delete().eq('id', id)
  throwIf(error)
  return { ok: true }
}

export async function getSessionSets(sessionId) {
  const { data, error } = await supabase
    .from('sets')
    .select('*')
    .eq('session_id', sessionId)
    .order('set_number', { ascending: true })
  throwIf(error)
  return data
}

// ---------- Fortschritt & letzte Gewichte ----------

export async function getExerciseProgress(exerciseName, userId) {
  const uid = userId || (await currentUserId())
  const { data, error } = await supabase
    .from('sets')
    .select('weight, sessions!inner(user_id, date)')
    .eq('sessions.user_id', uid)
    .eq('exercise_name', exerciseName)
    .not('weight', 'is', null)
  throwIf(error)

  const byDate = new Map()
  for (const s of data) {
    const date = s.sessions.date
    const w = Number(s.weight)
    if (!byDate.has(date) || w > byDate.get(date)) byDate.set(date, w)
  }
  return [...byDate.entries()]
    .sort((a, b) => new Date(a[0]) - new Date(b[0]))
    .map(([date, weight]) => ({ date, weight }))
}

export async function getLastWeights(planId, userId) {
  const uid = userId || (await currentUserId())
  const { data: lastSession, error } = await supabase
    .from('sessions')
    .select('id')
    .eq('user_id', uid)
    .eq('plan_id', planId)
    .order('date', { ascending: false })
    .limit(1)
  throwIf(error)
  if (!lastSession?.length) return {}

  const sets = await getSessionSets(lastSession[0].id)
  const weights = {}
  for (const s of sets) {
    if (!weights[s.exercise_name]) weights[s.exercise_name] = {}
    weights[s.exercise_name][s.set_number] = { weight: s.weight, reps: s.reps }
  }
  return weights
}

export async function getPlanStartData(planId) {
  const [exercises, lastWeights] = await Promise.all([
    getPlanExercises(planId),
    getLastWeights(planId),
  ])
  return { exercises, lastWeights }
}

// ---------- Coach: Kunden, Einladungen, Akte ----------

export async function getClients() {
  const uid = await currentUserId()
  const { data, error } = await supabase
    .from('coach_clients')
    .select('client_id, created_at, profiles!coach_clients_client_id_fkey(id, display_name)')
    .eq('coach_id', uid)
    .order('created_at', { ascending: true })
  throwIf(error)

  const clients = data.map((r) => ({
    id: r.client_id,
    name: r.profiles?.display_name || 'Klient',
    since: r.created_at,
  }))

  // Letzte Session pro Kunde (eine Query, in JS gruppiert)
  if (clients.length) {
    const { data: sessions, error: sErr } = await supabase
      .from('sessions')
      .select('user_id, date')
      .in('user_id', clients.map((c) => c.id))
      .order('date', { ascending: false })
    throwIf(sErr)
    const lastByUser = new Map()
    const weekAgo = Date.now() - 7 * 24 * 3600_000
    const countByUser = new Map()
    for (const s of sessions) {
      if (!lastByUser.has(s.user_id)) lastByUser.set(s.user_id, s.date)
      if (new Date(s.date).getTime() >= weekAgo) {
        countByUser.set(s.user_id, (countByUser.get(s.user_id) || 0) + 1)
      }
    }
    for (const c of clients) {
      c.lastSession = lastByUser.get(c.id) || null
      c.sessionsThisWeek = countByUser.get(c.id) || 0
    }
  }
  return clients
}

export async function removeClient(clientId) {
  const uid = await currentUserId()
  const { error } = await supabase
    .from('coach_clients')
    .delete()
    .eq('coach_id', uid)
    .eq('client_id', clientId)
  throwIf(error)
  return { ok: true }
}

// Code wird clientseitig erzeugt statt per DB-Default — robust gegen
// Schema-Varianten und spart die Abhängigkeit vom Default-Ausdruck.
function generateInviteCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function createInvitation(email) {
  const uid = await currentUserId()
  const { data, error } = await supabase
    .from('invitations')
    .insert({ coach_id: uid, email: nul(email), code: generateInviteCode() })
    .select()
    .single()
  throwIf(error)
  return data
}

export async function getOpenInvitations() {
  const uid = await currentUserId()
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('coach_id', uid)
    .is('accepted_by', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  throwIf(error)
  return data
}

export async function deleteInvitation(id) {
  const { error } = await supabase.from('invitations').delete().eq('id', id)
  throwIf(error)
  return { ok: true }
}

export async function acceptInvitation(code) {
  const { error } = await supabase.rpc('accept_invitation', { invite_code: code })
  throwIf(error)
  return { ok: true }
}

export async function getClientNotes(clientId) {
  const uid = await currentUserId()
  const { data, error } = await supabase
    .from('client_notes')
    .select('*')
    .eq('coach_id', uid)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
  throwIf(error)
  return data
}

export async function addClientNote(clientId, note) {
  const uid = await currentUserId()
  const { data, error } = await supabase
    .from('client_notes')
    .insert({ coach_id: uid, client_id: clientId, note })
    .select()
    .single()
  throwIf(error)
  return data
}

export async function deleteClientNote(id) {
  const { error } = await supabase.from('client_notes').delete().eq('id', id)
  throwIf(error)
  return { ok: true }
}

export async function getClientPlans(clientId) {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true })
  throwIf(error)
  return data
}

export async function assignPlanToClient(planId, clientId) {
  const { data, error } = await supabase.rpc('assign_plan_to_client', {
    p_plan_id: planId,
    p_client_id: clientId,
  })
  throwIf(error)
  return { ok: true, planId: data }
}

export async function getClientProfile(clientId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', clientId).single()
  throwIf(error)
  return data
}
