import { useEffect, useRef, useState } from 'react'
import { Timer, X } from 'lucide-react'
import { buzz } from '../utils/haptics.js'
import styles from './RestTimer.module.css'

export default function RestTimer({ endsAt, totalMs, onExtend, onSkip, onFinished }) {
  const [now, setNow] = useState(Date.now())
  const finishedRef = useRef(false)

  useEffect(() => {
    finishedRef.current = false
  }, [endsAt])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [])

  const remaining = Math.max(0, endsAt - now)
  const done = remaining === 0

  useEffect(() => {
    if (done && !finishedRef.current) {
      finishedRef.current = true
      buzz([200, 100, 200])
      beep()
      onFinished()
    }
  }, [done, onFinished])

  const secs = Math.ceil(remaining / 1000)
  const mm = Math.floor(secs / 60)
  const ss = String(secs % 60).padStart(2, '0')
  const fraction = totalMs > 0 ? remaining / totalMs : 0

  return (
    <div className={`${styles.bar} ${done ? styles.done : ''}`}>
      <div className={styles.progress} style={{ width: `${fraction * 100}%` }} />
      <div className={styles.content}>
        <span className={styles.label}>
          <Timer size={16} style={{ verticalAlign: '-3px', marginRight: 5 }} />
          {done ? 'Pause vorbei!' : 'Pause'}
        </span>
        {!done && <span className={styles.time}>{mm}:{ss}</span>}
        <div className={styles.actions}>
          {!done && (
            <button className={styles.timerBtn} onClick={onExtend}>+30s</button>
          )}
          <button className={styles.timerBtn} onClick={onSkip} aria-label={done ? 'Schließen' : 'Pause überspringen'}>{done ? <X size={14} /> : 'Skip'}</button>
        </div>
      </div>
    </div>
  )
}

function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
    osc.onended = () => ctx.close()
  } catch {
    /* Audio nicht verfügbar */
  }
}
