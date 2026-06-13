import { useState } from 'react'
import { Check, Minus, Plus, RotateCcw, Flame } from 'lucide-react'
import styles from './SetRow.module.css'

const WEIGHT_STEP = 2.5
const REPS_STEP = 1

function sanitizeDecimal(v) {
  return String(v).replace(',', '.').replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')
}
function sanitizeInt(v) {
  return String(v).replace(/[^0-9]/g, '')
}
function toNum(v) {
  const n = parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}
// Ganze Zahl ohne Nachkomma, sonst auf 0,1 gerundet
function fmtWeight(n) {
  if (!Number.isFinite(n) || n < 0) n = 0
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10)
}

// last = { weight, reps } aus der letzten Session für genau diesen Satz (oder undefined)
export default function SetRow({ index, set, last, onChange, onToggle, onFillSet }) {
  const [pr, setPr] = useState(false)

  function stepWeight(dir) {
    onChange('weight', fmtWeight(Math.max(0, toNum(set.weight) + dir * WEIGHT_STEP)))
  }
  function stepReps(dir) {
    onChange('reps', String(Math.max(0, (parseInt(set.reps) || 0) + dir * REPS_STEP)))
  }

  function handleToggle() {
    // „Stärker als zuletzt": nur beim Abhaken und wenn Gewicht den letzten Wert übertrifft
    if (!set.done && last && set.weight !== '' && toNum(set.weight) > toNum(last.weight)) {
      setPr(true)
      setTimeout(() => setPr(false), 2200)
    }
    onToggle()
  }

  return (
    <div className={`${styles.set} ${set.done ? styles.setDone : ''}`}>
      {pr && (
        <span className={styles.prFlash}>
          <Flame size={12} strokeWidth={2.5} /> Stärker als zuletzt
        </span>
      )}

      <div className={styles.top}>
        <span className={styles.setLabel}>Satz {index + 1}</span>
        {last && (
          <button type="button" className={styles.lastChip} onClick={onFillSet} title="Letzte Werte übernehmen">
            <RotateCcw size={12} /> zuletzt {fmtWeight(toNum(last.weight))} × {last.reps}
          </button>
        )}
      </div>

      <div className={styles.main}>
        <div className={styles.stepper}>
          <button type="button" className={styles.stepBtn} onClick={() => stepWeight(-1)} aria-label="Gewicht verringern"><Minus size={16} /></button>
          <input
            type="text"
            inputMode="decimal"
            className={styles.value}
            placeholder={last ? fmtWeight(toNum(last.weight)) : '0'}
            value={set.weight}
            onChange={e => onChange('weight', sanitizeDecimal(e.target.value))}
          />
          <button type="button" className={styles.stepBtn} onClick={() => stepWeight(1)} aria-label="Gewicht erhöhen"><Plus size={16} /></button>
        </div>

        <div className={styles.stepper}>
          <button type="button" className={styles.stepBtn} onClick={() => stepReps(-1)} aria-label="Wiederholungen verringern"><Minus size={16} /></button>
          <input
            type="text"
            inputMode="numeric"
            className={styles.value}
            placeholder={last ? String(last.reps) : '0'}
            value={set.reps}
            onChange={e => onChange('reps', sanitizeInt(e.target.value))}
          />
          <button type="button" className={styles.stepBtn} onClick={() => stepReps(1)} aria-label="Wiederholungen erhöhen"><Plus size={16} /></button>
        </div>

        <button
          className={`${styles.check} ${set.done ? styles.checked : ''}`}
          onClick={handleToggle}
          aria-label={set.done ? 'Satz-Häkchen entfernen' : 'Satz abhaken'}
          aria-pressed={set.done}
        >
          {set.done && <Check size={20} strokeWidth={3} />}
        </button>

        <span className={styles.unit}>kg</span>
        <span className={styles.unit}>Wdh</span>
      </div>
    </div>
  )
}
