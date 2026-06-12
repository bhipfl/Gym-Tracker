import { X, Check, Plus, Minus, RotateCcw } from 'lucide-react'
import SetRow from './SetRow.jsx'
import ExerciseImage from './ExerciseImage.jsx'
import styles from './ActiveExercise.module.css'

export default function ActiveExercise({ exercise, sets, hasLastWeights, onChange, onToggle, onAddSet, onRemoveSet, onFillLast, onRemoveExercise }) {
  const doneSets = sets.filter(s => s.done).length
  const allDone = sets.length > 0 && doneSets === sets.length

  return (
    <div className={`card ${styles.exercise} ${allDone ? styles.allDone : ''}`}>
      <div className={styles.exHeader}>
        <ExerciseImage name={exercise.exercise_name} size={44} />
        <div className={styles.exMeta}>
          <div className={styles.exName}>{exercise.exercise_name}</div>
          {exercise.muscle_group && <div className="text-xs text-muted">{exercise.muscle_group}</div>}
        </div>
        <div className={styles.exActions}>
          {hasLastWeights && (
            <button className={styles.fillBtn} onClick={onFillLast} title="Letzte Werte übernehmen" aria-label="Letzte Werte übernehmen">
              <RotateCcw size={16} />
            </button>
          )}
          <div className={`${styles.exProgress} ${allDone ? styles.done : ''}`}>
            {doneSets}/{sets.length}
          </div>
          <button className={styles.removeExBtn} onClick={onRemoveExercise} title="Übung entfernen" aria-label="Übung entfernen">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className={styles.labels}>
        <span>Satz</span>
        <span>Gewicht (kg)</span>
        <span>Wdh</span>
        <span><Check size={13} aria-label="abgehakt" /></span>
      </div>

      <div className={styles.sets}>
        {sets.map((set, i) => (
          <SetRow
            key={i}
            index={i}
            set={set}
            onChange={(field, val) => onChange(i, field, val)}
            onToggle={() => onToggle(i)}
          />
        ))}
      </div>

      <div className={styles.setActions}>
        <button className="btn btn-ghost btn-sm" onClick={onRemoveSet} disabled={sets.length <= 1}>
          <Minus size={14} /> Satz
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onAddSet}>
          <Plus size={14} /> Satz
        </button>
      </div>
    </div>
  )
}
