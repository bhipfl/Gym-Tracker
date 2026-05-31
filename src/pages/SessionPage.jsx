import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { getPlanExercises, getLastWeights, saveSession } from '../services/api.js'
import { addToOfflineQueue } from '../services/storage.js'
import ActiveExercise from '../components/ActiveExercise.jsx'
import SessionSummary from '../components/SessionSummary.jsx'
import styles from './SessionPage.module.css'

export default function SessionPage() {
  const { planId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const plan = location.state?.plan || { id: planId, name: 'Training' }

  const [exercises, setExercises] = useState([])
  const [lastWeights, setLastWeights] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sessionData, setSessionData] = useState({})
  const [finished, setFinished] = useState(false)
  const [saving, setSaving] = useState(false)
  const [startTime] = useState(new Date())

  useEffect(() => {
    Promise.all([getPlanExercises(planId), getLastWeights(planId)])
      .then(([exs, weights]) => {
        setExercises(exs)
        setLastWeights(weights)
        const initial = {}
        exs.forEach(ex => {
          const sets = parseInt(ex.default_sets) || 3
          initial[ex.id] = Array.from({ length: sets }, (_, i) => {
            const last = weights[ex.exercise_name]?.[i + 1]
            return { weight: last?.weight || '', reps: last?.reps || '', done: false }
          })
        })
        setSessionData(initial)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [planId])

  function handleSetChange(exId, setIdx, field, value) {
    setSessionData(prev => ({
      ...prev,
      [exId]: prev[exId].map((s, i) => i === setIdx ? { ...s, [field]: value } : s)
    }))
  }

  function handleSetToggle(exId, setIdx) {
    setSessionData(prev => ({
      ...prev,
      [exId]: prev[exId].map((s, i) => i === setIdx ? { ...s, done: !s.done } : s)
    }))
  }

  function handleAddSet(exId) {
    setSessionData(prev => ({
      ...prev,
      [exId]: [...prev[exId], { weight: '', reps: '', done: false }]
    }))
  }

  function handleRemoveSet(exId) {
    setSessionData(prev => {
      const sets = prev[exId]
      if (sets.length <= 1) return prev
      return { ...prev, [exId]: sets.slice(0, -1) }
    })
  }

  function buildSessionPayload() {
    const sets = []
    exercises.forEach(ex => {
      const exSets = sessionData[ex.id] || []
      exSets.forEach((s, i) => {
        if (s.weight || s.reps) {
          sets.push({
            exercise_id: ex.exercise_id || ex.id,
            exercise_name: ex.exercise_name,
            set_number: i + 1,
            weight: s.weight,
            reps: s.reps
          })
        }
      })
    })
    return {
      plan_id: planId,
      plan_name: plan.name,
      date: startTime.toISOString(),
      sets
    }
  }

  async function handleFinish() {
    setSaving(true)
    const payload = buildSessionPayload()
    try {
      await saveSession(payload)
    } catch (_) {
      addToOfflineQueue(payload)
    } finally {
      setSaving(false)
      setFinished(true)
    }
  }

  const totalDone = Object.values(sessionData).flat().filter(s => s.done).length
  const total = Object.values(sessionData).flat().length
  const progress = total > 0 ? (totalDone / total) * 100 : 0

  if (loading) return <div className="page"><div className="spinner" /></div>

  if (finished) {
    return (
      <SessionSummary
        plan={plan}
        date={startTime}
        exercises={exercises}
        sessionData={sessionData}
        onClose={() => navigate('/')}
      />
    )
  }

  return (
    <div className="page">
      <div className={styles.header}>
        <button className="btn btn-ghost" onClick={() => { if (confirm('Training abbrechen?')) navigate('/') }}>✕</button>
        <div className={styles.planTitle}>{plan.name}</div>
        <div className={styles.counter}>{totalDone}/{total}</div>
      </div>

      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
      </div>

      {error && <div className="error-msg">{error}</div>}

      {exercises.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🏋️</div>
          <h3>Keine Übungen im Plan</h3>
          <p>Füge zuerst Übungen zum Plan hinzu.</p>
          <button className="btn btn-secondary mt-3" onClick={() => navigate(`/plans/${planId}`, { state: { plan } })}>
            Plan bearbeiten
          </button>
        </div>
      ) : (
        <>
          <div className={styles.exercises}>
            {exercises.map(ex => (
              <ActiveExercise
                key={ex.id}
                exercise={ex}
                sets={sessionData[ex.id] || []}
                lastWeights={lastWeights[ex.exercise_name]}
                onChange={(setIdx, field, val) => handleSetChange(ex.id, setIdx, field, val)}
                onToggle={(setIdx) => handleSetToggle(ex.id, setIdx)}
                onAddSet={() => handleAddSet(ex.id)}
                onRemoveSet={() => handleRemoveSet(ex.id)}
              />
            ))}
          </div>

          <button
            className={`btn btn-primary btn-full ${styles.finishBtn}`}
            onClick={handleFinish}
            disabled={saving}
          >
            {saving ? 'Speichern...' : '🏁 Training beenden'}
          </button>
        </>
      )}
    </div>
  )
}
