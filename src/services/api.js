import { getConfig } from './storage.js'

function buildUrl(action, params = {}) {
  const config = getConfig()
  if (!config?.url) throw new Error('API nicht konfiguriert. Bitte Einstellungen öffnen.')
  const url = new URL(config.url)
  url.searchParams.set('action', action)
  url.searchParams.set('token', config.token || '')
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  return url.toString()
}

async function get(action, params = {}) {
  const res = await fetch(buildUrl(action, params), { redirect: 'follow' })
  if (!res.ok) throw new Error(`API Fehler: ${res.status}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data
}

async function post(action, body) {
  const config = getConfig()
  if (!config?.url) throw new Error('API nicht konfiguriert.')
  const url = new URL(config.url)
  url.searchParams.set('action', action)
  url.searchParams.set('token', config.token || '')
  const res = await fetch(url.toString(), {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error(`API Fehler: ${res.status}`)
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data
}

export async function testConnection() {
  return get('ping')
}

export async function getPlans() {
  const data = await get('getPlans')
  return data.plans || []
}

export async function savePlan(plan) {
  return post('savePlan', plan)
}

export async function deletePlan(id) {
  return post('deletePlan', { id })
}

export async function getPlanExercises(planId) {
  const data = await get('getPlanExercises', { planId })
  return data.exercises || []
}

export async function addExerciseToPlan(planId, exercise) {
  return post('addExerciseToPlan', { planId, ...exercise })
}

export async function removeExerciseFromPlan(planId, exerciseId) {
  return post('removeExerciseFromPlan', { planId, exerciseId })
}

export async function updatePlanExercise(planId, exerciseId, updates) {
  return post('updatePlanExercise', { planId, exerciseId, ...updates })
}

export async function searchExercises(q) {
  const data = await get('searchExercises', { q })
  return data.exercises || []
}

export async function getSessions(limit = 50) {
  const data = await get('getSessions', { limit })
  return data.sessions || []
}

export async function saveSession(session) {
  return post('saveSession', session)
}

export async function updateSession(session) {
  return post('updateSession', session)
}

export async function getSessionSets(sessionId) {
  const data = await get('getSessionSets', { sessionId })
  return data.sets || []
}

export async function getExerciseProgress(exerciseName) {
  const data = await get('getExerciseProgress', { exerciseName })
  return data.progress || []
}

export async function getLastWeights(planId) {
  const data = await get('getLastWeights', { planId })
  return data.weights || {}
}
