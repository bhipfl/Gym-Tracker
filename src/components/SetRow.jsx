import styles from './SetRow.module.css'

function sanitizeDecimal(v) {
  return String(v).replace(',', '.').replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
}
function sanitizeInt(v) {
  return String(v).replace(/[^0-9]/g, '')
}

export default function SetRow({ index, set, onChange, onToggle }) {
  return (
    <div className={`${styles.row} ${set.done ? styles.rowDone : ''}`}>
      <div className={`${styles.setNum} ${set.done ? styles.setNumDone : ''}`}>{index + 1}</div>

      <input
        type="text"
        inputMode="decimal"
        placeholder="0"
        value={set.weight}
        onChange={e => onChange('weight', sanitizeDecimal(e.target.value))}
        className={styles.input}
      />

      <input
        type="text"
        inputMode="numeric"
        placeholder="0"
        value={set.reps}
        onChange={e => onChange('reps', sanitizeInt(e.target.value))}
        className={styles.input}
      />

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
