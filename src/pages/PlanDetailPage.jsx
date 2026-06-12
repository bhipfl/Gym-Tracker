import { useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  usePlanExercises, useAddExerciseToPlan, useRemoveExerciseFromPlan,
  useUpdatePlanExercise, useReorderPlanExercises, useSavePlan, keys
} from '../hooks/queries.js'
import { ArrowLeft, Check, X, Pencil, Play, Plus, Trash2, Dumbbell, ChevronUp, ChevronDown } from 'lucide-react'
import ExercisePicker from '../components/ExercisePicker.jsx'
import ExerciseImage from '../components/ExerciseImage.jsx'
import { SkeletonPage } from '../components/Skeleton.jsx'
import styles from './PlanDetailPage.module.css'

export default function PlanDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [plan, setPlan] = useState(location.state?.plan || { id, name: 'Plan' })

  const exercisesQuery = usePlanExercises(id)
  const addExercise = useAddExerciseToPlan(id)
  const removeExercise = useRemoveExerciseFromPlan(id)
  const updateExercise = useUpdatePlanExercise(id)
  const reorderExercises = useReorderPlanExercises(id)
  const savePlan = useSavePlan()

  const [showPicker, setShowPicker] = useState(false)
  const [editingSets, setEditingSets] = useState(null)
  const [editingName, setEditingName] = useState(false)
  const [planName, setPlanName] = useState(plan.name)

  const exercises = exercisesQuery.data || []
  const error = exercisesQuery.error?.message || addExercise.error?.message
    || removeExercise.error?.message || updateExercise.error?.message
    || reorderExercises.error?.message || savePlan.error?.message

  function handleAddExercise(exercise) {
    setShowPicker(false)
    addExercise.mutate({ ...exercise, planId: id })
  }

  function handleRemove(ex) {
    if (!confirm(`"${ex.exercise_name}" aus Plan entfernen?`)) return
    removeExercise.mutate(ex.id)
  }

  function handleUpdateSets(ex, setsCount) {
    setEditingSets(null)
    updateExercise.mutate({ exerciseId: ex.id, updates: { default_sets: setsCount } })
  }

  function handleMove(index, direction) {
    const newList = [...exercises]
    const target = index + direction
    if (target < 0 || target >= newList.length) return
    ;[newList[index], newList[target]] = [newList[target], newList[index]]
    qc.setQueryData(keys.planExercises(id), newList)
    reorderExercises.mutate(newList.map((ex, i) => ({ id: ex.id, order: i })))
  }

  async function handleRename() {
    if (!planName.trim() || planName === plan.name) { setEditingName(false); return }
    const name = planName.trim()
    setPlan(prev => ({ ...prev, name }))
    setEditingName(false)
    savePlan.mutate({ ...plan, name })
  }

  if (exercisesQuery.isPending && !exercisesQuery.data) return <SkeletonPage count={5} />

  return (
    <div className="page">
      <div className={styles.header}>
        <button className="btn btn-ghost" onClick={() => navigate('/plans')}><ArrowLeft size={16} /> Zurück</button>

        {editingName ? (
          <div className={styles.renameWrap}>
            <input
              type="text"
              value={planName}
              onChange={e => setPlanName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') { setPlanName(plan.name); setEditingName(false) } }}
              autoFocus
              className={styles.renameInput}
            />
            <button className="btn btn-primary btn-sm" onClick={handleRename} aria-label="Übernehmen"><Check size={16} /></button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setPlanName(plan.name); setEditingName(false) }} aria-label="Abbrechen"><X size={16} /></button>
          </div>
        ) : (
          <button className={styles.titleBtn} onClick={() => setEditingName(true)} title="Plan umbenennen">
            <h1 className={styles.title}>{plan.name}</h1>
            <span className={styles.editIcon}><Pencil size={14} /></span>
          </button>
        )}

        <button className="btn btn-primary btn-sm" onClick={() => navigate(`/session/${id}`, { state: { plan } })}>
          <Play size={14} /> Start
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm text-muted font-bold">{exercises.length} Übung{exercises.length !== 1 ? 'en' : ''}</h2>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowPicker(true)}><Plus size={16} /> Übung</button>
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
          <div className="icon"><Dumbbell size={48} strokeWidth={1.5} /></div>
          <h3>Noch keine Übungen</h3>
          <p>Füge Übungen zu deinem Plan hinzu.</p>
          <button className="btn btn-primary mt-3" onClick={() => setShowPicker(true)}>Übung hinzufügen</button>
        </div>
      ) : (
        <div className={styles.list}>
          {exercises.map((ex, i) => (
            <div key={ex.id} className={`card ${styles.exCard}`} style={ex._pending ? { opacity: 0.6 } : undefined}>
              <div className={styles.reorderBtns}>
                <button
                  className={styles.moveBtn}
                  onClick={() => handleMove(i, -1)}
                  disabled={i === 0}
                  aria-label="Nach oben"
                ><ChevronUp size={16} /></button>
                <button
                  className={styles.moveBtn}
                  onClick={() => handleMove(i, 1)}
                  disabled={i === exercises.length - 1}
                  aria-label="Nach unten"
                ><ChevronDown size={16} /></button>
              </div>

              <ExerciseImage name={ex.exercise_name} size={40} />

              <div className={styles.exInfo}>
                <div className={styles.exName}>{ex.exercise_name}</div>
                {ex.muscle_group && <div className="text-xs text-muted">{ex.muscle_group}</div>}
              </div>

              <div className={styles.exRight}>
                {editingSets === ex.id ? (
                  <SetsEditor value={ex.default_sets} onSave={v => handleUpdateSets(ex, v)} onCancel={() => setEditingSets(null)} />
                ) : (
                  <button className={styles.setsBtn} onClick={() => setEditingSets(ex.id)}>
                    {ex.default_sets || 3} Sätze
                  </button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={() => handleRemove(ex)} aria-label="Übung entfernen"><Trash2 size={16} /></button>
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
        autoFocus
      />
      <button className="btn btn-primary btn-sm" onClick={() => onSave(v)} aria-label="Übernehmen"><Check size={16} /></button>
      <button className="btn btn-ghost btn-sm" onClick={onCancel} aria-label="Abbrechen"><X size={16} /></button>
    </div>
  )
}
