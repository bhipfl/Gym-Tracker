import SetRow from './SetRow.jsx'
import styles from './ActiveExercise.module.css'

export default function ActiveExercise({ exercise, sets, hasLastWeights, onChange, onToggle, onAddSet, onRemoveSet, onFillLast, onRemoveExercise }) {
  const doneSets = sets.filter(s => s.done).length
  const allDone = sets.length > 0 && doneSets === sets.length

  return (
    <div className={`card ${styles.exercise} ${allDone ? styles.allDone : ''}`}>
      <div className={styles.exHeader}>
        <div className={styles.exMeta}>
          <div className={styles.exName}>{exercise.exercise_name}</div>
          {exercise.muscle_group && <div className="text-xs text-muted">{exercise.muscle_group}</div>}
        </div>
        <div className={styles.exActions}>
          {hasLastWeights && (
            <button className={styles.fillBtn} onClick={onFillLast} title="Letzte Werte übernehmen">
              ↩
            </button>
          )}
          <div className={`${styles.exProgress} ${allDone ? styles.done : ''}`}>
            {doneSets}/{sets.length}
          </div>
          <button className={styles.removeExBtn} onClick={onRemoveExercise} title="Übung entfernen">
            ✕
          </button>
        </div>
      </div>

      <div className={styles.labels}>
        <span>Satz</span>
        <span>Gewicht (kg)</span>
        <span>Wdh</span>
        <span>✓</span>
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
          − Satz
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onAddSet}>
          + Satz
        </button>
      </div>
    </div>
  )
}
