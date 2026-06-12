import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../services/api.js'

export const keys = {
  plans: ['plans'],
  sessions: (limit) => ['sessions', limit],
  allSessions: ['sessions'],
  planExercises: (planId) => ['planExercises', planId],
  planStartData: (planId) => ['planStartData', planId],
  sessionSets: (sessionId) => ['sessionSets', sessionId],
  usedExerciseNames: ['usedExerciseNames'],
  exerciseProgress: (name) => ['exerciseProgress', name],
}

// ---------- Queries ----------

export function usePlans() {
  return useQuery({ queryKey: keys.plans, queryFn: api.getPlans })
}

export function useSessions(limit = 50) {
  return useQuery({ queryKey: keys.sessions(limit), queryFn: () => api.getSessions(limit) })
}

export function usePlanExercises(planId) {
  return useQuery({
    queryKey: keys.planExercises(planId),
    queryFn: () => api.getPlanExercises(planId),
    enabled: !!planId,
  })
}

export function usePlanStartData(planId) {
  return useQuery({
    queryKey: keys.planStartData(planId),
    queryFn: () => api.getPlanStartData(planId),
    enabled: !!planId,
    // Trainingsstart soll aktuelle "letzte Gewichte" haben
    staleTime: 0,
  })
}

export function useSessionSets(sessionId) {
  return useQuery({
    queryKey: keys.sessionSets(sessionId),
    queryFn: () => api.getSessionSets(sessionId),
    enabled: !!sessionId,
    staleTime: 0,
  })
}

export function useUsedExerciseNames() {
  return useQuery({ queryKey: keys.usedExerciseNames, queryFn: api.getUsedExerciseNames })
}

export function useExerciseProgress(name) {
  return useQuery({
    queryKey: keys.exerciseProgress(name),
    queryFn: () => api.getExerciseProgress(name),
    enabled: !!name,
  })
}

// ---------- Mutations ----------

export function useSavePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.savePlan,
    onMutate: async (plan) => {
      await qc.cancelQueries({ queryKey: keys.plans })
      const previous = qc.getQueryData(keys.plans)
      qc.setQueryData(keys.plans, (old = []) => {
        if (plan.id && old.some(p => p.id === plan.id)) {
          return old.map(p => (p.id === plan.id ? { ...p, ...plan } : p))
        }
        return [...old, { ...plan, id: plan.id || `tmp-${Date.now()}` }]
      })
      return { previous }
    },
    onError: (_e, _v, ctx) => ctx?.previous && qc.setQueryData(keys.plans, ctx.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.plans }),
  })
}

export function useDeletePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deletePlan,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: keys.plans })
      const previous = qc.getQueryData(keys.plans)
      qc.setQueryData(keys.plans, (old = []) => old.filter(p => p.id !== id))
      return { previous }
    },
    onError: (_e, _v, ctx) => ctx?.previous && qc.setQueryData(keys.plans, ctx.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.plans }),
  })
}

export function useAddExerciseToPlan(planId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (exercise) => api.addExerciseToPlan(planId, exercise),
    onMutate: async (exercise) => {
      await qc.cancelQueries({ queryKey: keys.planExercises(planId) })
      const previous = qc.getQueryData(keys.planExercises(planId))
      qc.setQueryData(keys.planExercises(planId), (old = []) => [
        ...old,
        { id: `tmp-${Date.now()}`, ...exercise, _pending: true },
      ])
      return { previous }
    },
    onError: (_e, _v, ctx) => ctx?.previous && qc.setQueryData(keys.planExercises(planId), ctx.previous),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: keys.planExercises(planId) })
      qc.invalidateQueries({ queryKey: keys.planStartData(planId) })
    },
  })
}

export function useRemoveExerciseFromPlan(planId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (exerciseId) => api.removeExerciseFromPlan(planId, exerciseId),
    onMutate: async (exerciseId) => {
      await qc.cancelQueries({ queryKey: keys.planExercises(planId) })
      const previous = qc.getQueryData(keys.planExercises(planId))
      qc.setQueryData(keys.planExercises(planId), (old = []) => old.filter(e => e.id !== exerciseId))
      return { previous }
    },
    onError: (_e, _v, ctx) => ctx?.previous && qc.setQueryData(keys.planExercises(planId), ctx.previous),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: keys.planExercises(planId) })
      qc.invalidateQueries({ queryKey: keys.planStartData(planId) })
    },
  })
}

export function useUpdatePlanExercise(planId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ exerciseId, updates }) => api.updatePlanExercise(planId, exerciseId, updates),
    onMutate: async ({ exerciseId, updates }) => {
      await qc.cancelQueries({ queryKey: keys.planExercises(planId) })
      const previous = qc.getQueryData(keys.planExercises(planId))
      qc.setQueryData(keys.planExercises(planId), (old = []) =>
        old.map(e => (e.id === exerciseId ? { ...e, ...updates } : e))
      )
      return { previous }
    },
    onError: (_e, _v, ctx) => ctx?.previous && qc.setQueryData(keys.planExercises(planId), ctx.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.planExercises(planId) }),
  })
}

export function useReorderPlanExercises(planId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.reorderPlanExercises,
    onError: () => qc.invalidateQueries({ queryKey: keys.planExercises(planId) }),
  })
}

export function useDeleteSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteSession,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: keys.allSessions })
      const snapshots = qc.getQueriesData({ queryKey: keys.allSessions })
      snapshots.forEach(([key, data]) => {
        if (Array.isArray(data)) qc.setQueryData(key, data.filter(s => s.id !== id))
      })
      return { snapshots }
    },
    onError: (_e, _v, ctx) => ctx?.snapshots?.forEach(([key, data]) => qc.setQueryData(key, data)),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.allSessions }),
  })
}

// ---------- Coach ----------

export const coachKeys = {
  clients: ['coach', 'clients'],
  invitations: ['coach', 'invitations'],
  clientNotes: (clientId) => ['coach', 'notes', clientId],
  clientPlans: (clientId) => ['coach', 'clientPlans', clientId],
  clientSessions: (clientId) => ['coach', 'clientSessions', clientId],
  clientExerciseNames: (clientId) => ['coach', 'clientExerciseNames', clientId],
  clientProgress: (clientId, name) => ['coach', 'clientProgress', clientId, name],
}

export function useClients() {
  return useQuery({ queryKey: coachKeys.clients, queryFn: api.getClients })
}

export function useOpenInvitations() {
  return useQuery({ queryKey: coachKeys.invitations, queryFn: api.getOpenInvitations })
}

export function useCreateInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createInvitation,
    onSettled: () => qc.invalidateQueries({ queryKey: coachKeys.invitations }),
  })
}

export function useDeleteInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteInvitation,
    onSettled: () => qc.invalidateQueries({ queryKey: coachKeys.invitations }),
  })
}

export function useClientNotes(clientId) {
  return useQuery({
    queryKey: coachKeys.clientNotes(clientId),
    queryFn: () => api.getClientNotes(clientId),
    enabled: !!clientId,
  })
}

export function useAddClientNote(clientId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (note) => api.addClientNote(clientId, note),
    onSettled: () => qc.invalidateQueries({ queryKey: coachKeys.clientNotes(clientId) }),
  })
}

export function useDeleteClientNote(clientId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteClientNote,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: coachKeys.clientNotes(clientId) })
      const previous = qc.getQueryData(coachKeys.clientNotes(clientId))
      qc.setQueryData(coachKeys.clientNotes(clientId), (old = []) => old.filter(n => n.id !== id))
      return { previous }
    },
    onError: (_e, _v, ctx) => ctx?.previous && qc.setQueryData(coachKeys.clientNotes(clientId), ctx.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: coachKeys.clientNotes(clientId) }),
  })
}

export function useClientPlans(clientId) {
  return useQuery({
    queryKey: coachKeys.clientPlans(clientId),
    queryFn: () => api.getClientPlans(clientId),
    enabled: !!clientId,
  })
}

export function useClientSessions(clientId, limit = 20) {
  return useQuery({
    queryKey: coachKeys.clientSessions(clientId),
    queryFn: () => api.getSessions(limit, clientId),
    enabled: !!clientId,
  })
}

export function useClientExerciseNames(clientId) {
  return useQuery({
    queryKey: coachKeys.clientExerciseNames(clientId),
    queryFn: () => api.getUsedExerciseNames(clientId),
    enabled: !!clientId,
  })
}

export function useClientProgress(clientId, exerciseName) {
  return useQuery({
    queryKey: coachKeys.clientProgress(clientId, exerciseName),
    queryFn: () => api.getExerciseProgress(exerciseName, clientId),
    enabled: !!clientId && !!exerciseName,
  })
}

export function useAssignPlanToClient(clientId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (planId) => api.assignPlanToClient(planId, clientId),
    onSettled: () => qc.invalidateQueries({ queryKey: coachKeys.clientPlans(clientId) }),
  })
}

// Nach erfolgreichem Speichern/Bearbeiten einer Session alles Relevante invalidieren.
export function useInvalidateAfterSession() {
  const qc = useQueryClient()
  return (planId) => {
    qc.invalidateQueries({ queryKey: keys.allSessions })
    qc.invalidateQueries({ queryKey: keys.usedExerciseNames })
    qc.invalidateQueries({ queryKey: ['exerciseProgress'] })
    qc.invalidateQueries({ queryKey: ['sessionSets'] })
    if (planId) qc.invalidateQueries({ queryKey: keys.planStartData(planId) })
  }
}
