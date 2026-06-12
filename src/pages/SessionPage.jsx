import { useEffect, useState, useCallback } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { saveSession, updateSession, isNetworkError } from '../services/api.js'
import { usePlanStartData, useSessionSets, useInvalidateAfterSession } from '../hooks/queries.js'
import { addToOfflineQueue, getConfig } from '../services/storage.js'
import { buzz } from '../utils/haptics.js'
import ActiveExercise from '../components/ActiveExercise.jsx'
import ExercisePicker from '../components/ExercisePicker.jsx'
import SessionSummary from '../components/SessionSummary.jsx'
import RestTimer from '../components/RestTimer.jsx'
import { SkeletonPage } from '../components/Skeleton.jsx'
import styles from './SessionPage.module.css'

export default function SessionPage() {
  const { planId, sessionId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const editMode = !!sessionId
  const editSession = location.state?.session
  const invalidateAfterSession = useInvalidateAfterSession()

  const plan = editMode
    ? { id: editSession?.plan_id || '', name: editSession?.plan_name || 'Training' }
    : (location.state?.plan || { id: planId, name: 'Training' })

  const startQuery = usePlanStartData(editMode ? null : planId)
  const setsQuery = useSessionSets(editMode ? sessionId : null)

  const [exercises, setExercises] = useState([])
  const [lastWeights, setLastWeights] = useState({})
  const [initialized, setInitialized] = useState(false)
  const [error, setError] = useState(null)
  const [sessionData, setSessionData] = useState({})  // { [exId]: [{weight, reps, done}] }
  const [notes, setNotes] = useState('')
  const [finished, setFinished] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [rest, setRest] = useState(null) // { endsAt, totalMs }
  const restSeconds = Number(getConfig()?.restSeconds) || 90
  const [sessionDate] = useState(() =>
    editMode && editSession?.date ? new Date(editSession.date) : new Date()
  )

  // Einmalige Initialisierung des lokalen Trainings-States aus den Query-Daten —
  // spätere Background-Refetches dürfen laufende Eingaben nicht überschreiben.
  useEffect(() => {
    if (initialized) return

    if (editMode && setsQuery.data) {
      const sets = setsQuery.data
      setNotes(editSession?.notes || '')
      const order = []
      const byEx = {}
      sets
        .slice()
        .sort((a, b) => (Number(a.set_number) || 0) - (Number(b.set_number) || 0))
        .forEach(s => {
          if (!byEx[s.exercise_name]) {
            byEx[s.exercise_name] = { exercise_id: s.exercise_id, sets: [] }
            order.push(s.exercise_name)
          }
          byEx[s.exercise_name].sets.push({
            weight: s.weight != null ? String(s.weight) : '',
            reps: s.reps != null ? String(s.reps) : '',
            done: true // pre-mark done in edit mode so they save by default
          })
        })
      const exs = order.map((name, i) => ({
        id: `edit-${i}`,
        exercise_id: byEx[name].exercise_id,
        exercise_name: name,
        default_sets: byEx[name].sets.length
      }))
      const initial = {}
      exs.forEach((ex, i) => { initial[ex.id] = byEx[order[i]].sets })
      setExercises(exs)
      setSessionData(initial)
      setInitialized(true)
      return
    }

    if (!editMode && startQuery.data) {
      const { exercises: exs, lastWeights: lw } = startQuery.data
      setExercises(exs)
      setLastWeights(lw)
      const initial = {}
      exs.forEach(ex => {
        const count = parseInt(ex.default_sets) || 3
        initial[ex.id] = Array.from({ length: count }, () => ({ weight: '', reps: '', done: false }))
      })
      setSessionData(initial)
      setInitialized(true)
    }
  }, [initialized, editMode, setsQuery.data, startQuery.data, editSession])

  // Bildschirm während des Trainings wach halten (wo unterstützt).
  useEffect(() => {
    let lock = null
    let released = false
    async function acquire() {
      try {
        lock = await navigator.wakeLock?.request('screen')
      } catch { /* nicht unterstützt oder verweigert */ }
    }
    function onVisible() {
      if (document.visibilityState === 'visible' && !released) acquire()
    }
    acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      released = true
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release?.().catch(() => {})
    }
  }, [])

  const handleSetChange = useCallback((exId, setIdx, field, value) => {
    setSessionData(prev => ({
      ...prev,
      [exId]: prev[exId].map((s, i) => i === setIdx ? { ...s, [field]: value } : s)
    }))
  }, [])

  const startRest = useCallback(() => {
    setRest({ endsAt: Date.now() + restSeconds * 1000, totalMs: restSeconds * 1000 })
  }, [restSeconds])

  const handleSetToggle = useCallback((exId, setIdx) => {
    setSessionData(prev => {
      const willBeDone = !prev[exId][setIdx].done
      if (willBeDone) {
        buzz(15)
        if (!editMode) startRest()
      }
      return {
        ...prev,
        [exId]: prev[exId].map((s, i) => i === setIdx ? { ...s, done: !s.done } : s)
      }
    })
  }, [editMode, startRest])

  const handleAddSet = useCallback((exId) => {
    setSessionData(prev => ({ ...prev, [exId]: [...prev[exId], { weight: '', reps: '', done: false }] }))
  }, [])

  const handleRemoveSet = useCallback((exId) => {
    setSessionData(prev => {
      if (prev[exId].length <= 1) return prev
      return { ...prev, [exId]: prev[exId].slice(0, -1) }
    })
  }, [])

  function handleFillLastWeights(ex) {
    const lw = lastWeights[ex.exercise_name]
    if (!lw) return
    setSessionData(prev => ({
      ...prev,
      [ex.id]: prev[ex.id].map((s, i) => {
        const last = lw[i + 1]
        if (!last) return s
        return { ...s, weight: s.weight || String(last.weight || ''), reps: s.reps || String(last.reps || '') }
      })
    }))
  }

  function handleRemoveExercise(exId) {
    setExercises(prev => prev.filter(ex => ex.id !== exId))
    setSessionData(prev => { const next = { ...prev }; delete next[exId]; return next })
  }

  function handleAddExercise(exercise) {
    setShowPicker(false)
    const newId = `new-${Date.now()}`
    const count = parseInt(exercise.default_sets) || 3
    setExercises(prev => [...prev, { id: newId, exercise_id: exercise.exercise_id, exercise_name: exercise.exercise_name, muscle_group: exercise.muscle_group || '', default_sets: count }])
    setSessionData(prev => ({ ...prev, [newId]: Array.from({ length: count }, () => ({ weight: '', reps: '', done: false })) }))
  }

  function buildPayload() {
    const sets = []
    exercises.forEach(ex => {
      ;(sessionData[ex.id] || []).forEach((s, i) => {
        // Only save sets that are marked done
        if (!s.done) return
        sets.push({
          exercise_id: ex.exercise_id || '',
          exercise_name: ex.exercise_name,
          set_number: i + 1,
          weight: s.weight,
          reps: s.reps
        })
      })
    })
    return { plan_id: plan.id || '', plan_name: plan.name, date: sessionDate.toISOString(), notes, sets }
  }

  async function handleFinish() {
    setSaving(true)
    setError(null)
    setRest(null)
    const payload = buildPayload()

    if (editMode) {
      try {
        await updateSession({ ...payload, session_id: sessionId })
        invalidateAfterSession(plan.id)
        buzz([30, 50, 30])
        setFinished(true)
      } catch (err) {
        setError('Speichern fehlgeschlagen: ' + err.message)
      } finally {
        setSaving(false)
      }
      return
    }

    try {
      await saveSession(payload)
      invalidateAfterSession(plan.id)
    } catch (err) {
      if (isNetworkError(err) || !navigator.onLine) {
        addToOfflineQueue(payload)
      } else {
        setError('Speichern fehlgeschlagen: ' + err.message)
        setSaving(false)
        return
      }
    }
    setSaving(false)
    buzz([30, 50, 30])
    setFinished(true)
  }

  const doneSets = Object.values(sessionData).flat().filter(s => s.done).length
  const total = Object.values(sessionData).flat().length
  const progress = total > 0 ? (doneSets / total) * 100 : 0

  const queryError = editMode ? setsQuery.error : startQuery.error
  if (!initialized && queryError) {
    return (
      <div className={styles.fullpage}>
        <div className="page"><div className="error-msg">{queryError.message}</div></div>
      </div>
    )
  }
  if (!initialized) return <SkeletonPage title={false} count={4} />

  if (finished) {
    return (
      <SessionSummary
        plan={plan}
        date={sessionDate}
        exercises={exercises}
        sessionData={sessionData}
        isEdit={editMode}
        onClose={() => navigate(editMode ? '/history' : '/')}
      />
    )
  }

  return (
    <div className={styles.fullpage}>
      {/* Header */}
      <div className={styles.header}>
        <button
          className="btn btn-ghost"
          onClick={() => { if (confirm(editMode ? 'Bearbeitung verwerfen?' : 'Training abbrechen?')) navigate(editMode ? '/history' : '/') }}
        >
          ✕
        </button>
        <div className={styles.planTitle}>
          {editMode && <span className={styles.editBadge}>✏️ </span>}
          {plan.name}
        </div>
        <div className={styles.counter}>{doneSets}/{total}</div>
      </div>

      {/* Progress bar */}
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
      </div>

      {/* Scrollable content */}
      <div className={styles.scroll}>
        {error && <div className="error-msg">{error}</div>}

        {exercises.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🏋️</div>
            <h3>{editMode ? 'Keine Sätze gefunden' : 'Keine Übungen im Plan'}</h3>
            {!editMode && (
              <button className="btn btn-secondary mt-3" onClick={() => navigate(`/plans/${planId}`, { state: { plan } })}>
                Plan bearbeiten
              </button>
            )}
          </div>
        ) : (
          exercises.map(ex => (
            <ActiveExercise
              key={ex.id}
              exercise={ex}
              sets={sessionData[ex.id] || []}
              hasLastWeights={!editMode && !!lastWeights[ex.exercise_name]}
              onChange={(setIdx, field, val) => handleSetChange(ex.id, setIdx, field, val)}
              onToggle={(setIdx) => handleSetToggle(ex.id, setIdx)}
              onAddSet={() => handleAddSet(ex.id)}
              onRemoveSet={() => handleRemoveSet(ex.id)}
              onFillLast={() => handleFillLastWeights(ex)}
              onRemoveExercise={() => handleRemoveExercise(ex.id)}
            />
          ))
        )}

        {/* Add exercise mid-session */}
        {showPicker ? (
          <ExercisePicker
            onSelect={handleAddExercise}
            onCancel={() => setShowPicker(false)}
            existingNames={exercises.map(e => e.exercise_name)}
          />
        ) : (
          <button className={`btn btn-secondary btn-full ${styles.addExBtn}`} onClick={() => setShowPicker(true)}>
            ➕ Übung hinzufügen
          </button>
        )}

        {/* Session notes */}
        <div className={styles.notesWrap}>
          <label className="label">Notiz (optional)</label>
          <textarea
            className={styles.notes}
            placeholder="z.B. Schulter zwickt, nächstes Mal mehr Gewicht..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
          />
        </div>
      </div>

      {/* Rest timer between sets */}
      {rest && (
        <RestTimer
          endsAt={rest.endsAt}
          totalMs={rest.totalMs}
          onExtend={() => setRest(r => r && { endsAt: r.endsAt + 30_000, totalMs: r.totalMs + 30_000 })}
          onSkip={() => setRest(null)}
          onFinished={() => setTimeout(() => setRest(r => (r && Date.now() >= r.endsAt ? null : r)), 4000)}
        />
      )}

      {/* Sticky finish button */}
      <div className={styles.footer}>
        <button className="btn btn-primary btn-full" onClick={handleFinish} disabled={saving}>
          {saving ? 'Speichern...' : editMode ? '💾 Änderungen speichern' : '🏁 Training beenden'}
        </button>
      </div>
    </div>
  )
}
