import { useEffect, useState, useCallback } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { getPlanStartData, getSessionSets, saveSession, updateSession } from '../services/api.js'
import { addToOfflineQueue } from '../services/storage.js'
import ActiveExercise from '../components/ActiveExercise.jsx'
import ExercisePicker from '../components/ExercisePicker.jsx'
import SessionSummary from '../components/SessionSummary.jsx'
import styles from './SessionPage.module.css'

export default function SessionPage() {
  const { planId, sessionId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const editMode = !!sessionId
  const editSession = location.state?.session

  const plan = editMode
    ? { id: editSession?.plan_id || '', name: editSession?.plan_name || 'Training' }
    : (location.state?.plan || { id: planId, name: 'Training' })

  const [exercises, setExercises] = useState([])
  const [lastWeights, setLastWeights] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sessionData, setSessionData] = useState({})  // { [exId]: [{weight, reps, done}] }
  const [notes, setNotes] = useState('')
  const [finished, setFinished] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [sessionDate] = useState(() =>
    editMode && editSession?.date ? new Date(editSession.date) : new Date()
  )

  useEffect(() => {
    if (editMode) {
      getSessionSets(sessionId)
        .then(sets => {
          setNotes(editSession?.notes || '')
          const order = []
          const byEx = {}
          sets
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
        })
        .catch(e => setError(e.message))
        .finally(() => setLoading(false))
      return
    }

    getPlanStartData(planId)
      .then(({ exercises: exs, lastWeights: lw }) => {
        setExercises(exs)
        setLastWeights(lw)
        const initial = {}
        exs.forEach(ex => {
          const count = parseInt(ex.default_sets) || 3
          initial[ex.id] = Array.from({ length: count }, () => ({ weight: '', reps: '', done: false }))
        })
        setSessionData(initial)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [planId, sessionId, editMode])

  const handleSetChange = useCallback((exId, setIdx, field, value) => {
    setSessionData(prev => ({
      ...prev,
      [exId]: prev[exId].map((s, i) => i === setIdx ? { ...s, [field]: value } : s)
    }))
  }, [])

  const handleSetToggle = useCallback((exId, setIdx) => {
    setSessionData(prev => ({
      ...prev,
      [exId]: prev[exId].map((s, i) => i === setIdx ? { ...s, done: !s.done } : s)
    }))
  }, [])

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
    const payload = buildPayload()

    if (editMode) {
      try {
        await updateSession({ ...payload, session_id: sessionId })
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
    } catch (err) {
      if (err instanceof TypeError || !navigator.onLine) {
        addToOfflineQueue(payload)
      } else {
        setError('Speichern fehlgeschlagen: ' + err.message)
        setSaving(false)
        return
      }
    }
    setSaving(false)
    setFinished(true)
  }

  const doneSets = Object.values(sessionData).flat().filter(s => s.done).length
  const total = Object.values(sessionData).flat().length
  const progress = total > 0 ? (doneSets / total) * 100 : 0

  if (loading) return <div className={styles.fullpage}><div className="spinner" /></div>

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

      {/* Sticky finish button */}
      <div className={styles.footer}>
        <button className="btn btn-primary btn-full" onClick={handleFinish} disabled={saving}>
          {saving ? 'Speichern...' : editMode ? '💾 Änderungen speichern' : '🏁 Training beenden'}
        </button>
      </div>
    </div>
  )
}
