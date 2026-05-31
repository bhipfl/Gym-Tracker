import SetRow from './SetRow.jsx'
import styles from './ActiveExercise.module.css'

export default function ActiveExercise({ exercise, sets, lastWeights, onChange, onToggle, onAddSet, onRemoveSet }) {
  const doneSets = sets.filter(s => s.done).length

  return (
    <div className={`card ${styles.exercise}`}>
      <div className={styles.exHeader}>
        <div>
          <div className={styles.exName}>{exercise.exercise_name}</div>
          {exercise.muscle_group && <div className="text-xs text-muted">{exercise.muscle_group}</div>}
        </div>
        <div className={styles.exProgress}>
          <span className={doneSets === sets.length && sets.length > 0 ? styles.done : ''}>
            {doneSets}/{sets.length}
          </span>
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
            lastData={lastWeights?.[i + 1]}
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
