import { getConfig } from './storage.js'

function buildUrl(action, params = {}) {
  const config = getConfig()
  if (!config?.url) throw new Error('API nicht konfiguriert. Bitte Einstellungen öffnen.')
  const url = new URL(config.url)
  url.searchParams.set('action', action)
  url.searchParams.set('token', config.token || '')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
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

export const testConnection = () => get('ping')

export async function getPlans() { return (await get('getPlans')).plans || [] }
export const savePlan = (plan) => post('savePlan', plan)
export const deletePlan = (id) => post('deletePlan', { id })

export async function getPlanExercises(planId) { return (await get('getPlanExercises', { planId })).exercises || [] }

// Single round-trip for session start
export async function getPlanStartData(planId) {
  const data = await get('getPlanStartData', { planId })
  return { exercises: data.exercises || [], lastWeights: data.lastWeights || {} }
}

export const addExerciseToPlan = (planId, exercise) => post('addExerciseToPlan', { planId, ...exercise })
export const removeExerciseFromPlan = (planId, exerciseId) => post('removeExerciseFromPlan', { planId, exerciseId })
export const updatePlanExercise = (planId, exerciseId, updates) => post('updatePlanExercise', { planId, exerciseId, ...updates })
export const reorderPlanExercises = (updates) => post('reorderPlanExercises', { updates })

export async function searchExercises(q) { return (await get('searchExercises', { q })).exercises || [] }
export async function getUsedExerciseNames() { return (await get('getUsedExerciseNames')).names || [] }

export async function getSessions(limit = 50) { return (await get('getSessions', { limit })).sessions || [] }
export const saveSession = (session) => post('saveSession', session)
export const updateSession = (session) => post('updateSession', session)
export const deleteSession = (id) => post('deleteSession', { id })

export async function getSessionSets(sessionId) { return (await get('getSessionSets', { sessionId })).sets || [] }
export async function getExerciseProgress(exerciseName) { return (await get('getExerciseProgress', { exerciseName })).progress || [] }
export async function getLastWeights(planId) { return (await get('getLastWeights', { planId })).weights || {} }
