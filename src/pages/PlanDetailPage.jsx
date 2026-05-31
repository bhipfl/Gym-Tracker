import { useEffect, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { getPlanExercises, addExerciseToPlan, removeExerciseFromPlan, updatePlanExercise } from '../services/api.js'
import ExercisePicker from '../components/ExercisePicker.jsx'
import styles from './PlanDetailPage.module.css'

export default function PlanDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const plan = location.state?.plan || { id, name: 'Plan' }

  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showPicker, setShowPicker] = useState(false)
  const [editingSets, setEditingSets] = useState(null)

  async function load() {
    try {
      setExercises(await getPlanExercises(id))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function handleAddExercise(exercise) {
    setShowPicker(false)
    try {
      await addExerciseToPlan(id, { ...exercise, planId: id })
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleRemove(ex) {
    if (!confirm(`"${ex.exercise_name}" aus Plan entfernen?`)) return
    try {
      await removeExerciseFromPlan(id, ex.id)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleUpdateSets(ex, sets) {
    setEditingSets(null)
    try {
      await updatePlanExercise(id, ex.id, { default_sets: sets })
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  if (loading) return <div className="page"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className={styles.header}>
        <button className="btn btn-ghost" onClick={() => navigate('/plans')}>← Zurück</button>
        <h1 className={styles.title}>{plan.name}</h1>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => navigate(`/session/${id}`, { state: { plan } })}
        >
          ▶ Start
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm text-muted font-bold">{exercises.length} Übung{exercises.length !== 1 ? 'en' : ''}</h2>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowPicker(true)}>+ Übung</button>
      </div>

      {showPicker && (
        <ExercisePicker
          onSelect={handleAddExercise}
          onCancel={() => setShowPicker(false)}
          existingNames={exercises.map(e => e.exercise_name)}
        />
      )}

      {exercises.length === 0 && !showPicker ? (
        <div className="empty-state">
          <div className="icon">🏋️</div>
          <h3>Noch keine Übungen</h3>
          <p>Füge Übungen zu deinem Plan hinzu.</p>
          <button className="btn btn-primary mt-3" onClick={() => setShowPicker(true)}>Übung hinzufügen</button>
        </div>
      ) : (
        <div className={styles.list}>
          {exercises.map((ex, i) => (
            <div key={ex.id} className={`card ${styles.exCard}`}>
              <div className={styles.exNum}>{i + 1}</div>
              <div className={styles.exInfo}>
                <div className={styles.exName}>{ex.exercise_name}</div>
                {ex.muscle_group && <div className="text-xs text-muted">{ex.muscle_group}</div>}
              </div>
              <div className={styles.exRight}>
                {editingSets === ex.id ? (
                  <SetsEditor
                    value={ex.default_sets}
                    onSave={v => handleUpdateSets(ex, v)}
                    onCancel={() => setEditingSets(null)}
                  />
                ) : (
                  <button
                    className={styles.setsBtn}
                    onClick={() => setEditingSets(ex.id)}
                    title="Sätze bearbeiten"
                  >
                    {ex.default_sets || 3} Sätze
                  </button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => handleRemove(ex)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SetsEditor({ value, onSave, onCancel }) {
  const [v, setV] = useState(parseInt(value) || 3)
  return (
    <div className="flex gap-2 items-center">
      <input
        type="number"
        min="1"
        max="10"
        value={v}
        onChange={e => setV(parseInt(e.target.value) || 1)}
        style={{ width: 56, textAlign: 'center' }}
      />
      <button className="btn btn-primary btn-sm" onClick={() => onSave(v)}>✓</button>
      <button className="btn btn-ghost btn-sm" onClick={onCancel}>✕</button>
    </div>
  )
}
