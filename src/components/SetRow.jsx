import styles from './SetRow.module.css'

export default function SetRow({ index, set, lastData, onChange, onToggle }) {
  return (
    <div className={`${styles.row} ${set.done ? styles.rowDone : ''}`}>
      <div className={styles.setNum}>{index + 1}</div>

      <div className={styles.inputWrap}>
        <input
          type="number"
          inputMode="decimal"
          step="0.5"
          min="0"
          placeholder={lastData?.weight || '0'}
          value={set.weight}
          onChange={e => onChange('weight', e.target.value)}
          className={styles.input}
          disabled={set.done}
        />
        {lastData?.weight && !set.weight && (
          <span className={styles.hint}>{lastData.weight}</span>
        )}
      </div>

      <div className={styles.inputWrap}>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          placeholder={lastData?.reps || '0'}
          value={set.reps}
          onChange={e => onChange('reps', e.target.value)}
          className={styles.input}
          disabled={set.done}
        />
      </div>

      <button
        className={`${styles.check} ${set.done ? styles.checked : ''}`}
        onClick={onToggle}
        aria-label="Satz abhaken"
      >
        {set.done ? '✓' : ''}
      </button>
    </div>
  )
}
