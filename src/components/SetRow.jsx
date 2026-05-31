import styles from './SetRow.module.css'

// Komma -> Punkt, nur Ziffern und ein Dezimaltrenner
function sanitizeDecimal(v) {
  return String(v)
    .replace(',', '.')
    .replace(/[^0-9.]/g, '')
    .replace(/(\..*)\./g, '$1')
}

function sanitizeInt(v) {
  return String(v).replace(/[^0-9]/g, '')
}

export default function SetRow({ index, set, lastData, onChange, onToggle }) {
  return (
    <div className={`${styles.row} ${set.done ? styles.rowDone : ''}`}>
      <div className={styles.setNum}>{index + 1}</div>

      <div className={styles.inputWrap}>
        <input
          type="text"
          inputMode="decimal"
          placeholder={lastData?.weight != null ? String(lastData.weight) : '0'}
          value={set.weight}
          onChange={e => onChange('weight', sanitizeDecimal(e.target.value))}
          className={styles.input}
          disabled={set.done}
        />
      </div>

      <div className={styles.inputWrap}>
        <input
          type="text"
          inputMode="numeric"
          placeholder={lastData?.reps != null ? String(lastData.reps) : '0'}
          value={set.reps}
          onChange={e => onChange('reps', sanitizeInt(e.target.value))}
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
