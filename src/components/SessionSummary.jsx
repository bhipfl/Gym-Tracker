import { useState } from 'react'
import styles from './SessionSummary.module.css'

function buildText(plan, date, exercises, sessionData) {
  const dateStr = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const lines = [`Training vom ${dateStr} – ${plan.name}`, '']

  let totalVolume = 0

  exercises.forEach(ex => {
    const sets = sessionData[ex.id] || []
    const filledSets = sets.filter(s => s.weight || s.reps)
    if (filledSets.length === 0) return

    lines.push(`${ex.exercise_name}:`)
    filledSets.forEach((s, i) => {
      const weight = s.weight || '–'
      const reps = s.reps || '–'
      lines.push(`  Satz ${i + 1}: ${weight} kg × ${reps} Wdh`)
      if (s.weight && s.reps) totalVolume += parseFloat(s.weight) * parseInt(s.reps)
    })
    lines.push('')
  })

  if (totalVolume > 0) {
    lines.push(`Gesamtvolumen: ${totalVolume.toLocaleString('de-DE')} kg`)
  }

  return lines.join('\n').trim()
}

export default function SessionSummary({ plan, date, exercises, sessionData, onClose }) {
  const [copied, setCopied] = useState(false)
  const text = buildText(plan, date, exercises, sessionData)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (_) {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const duration = Math.round((new Date() - date) / 60000)

  return (
    <div className="page">
      <div className={styles.hero}>
        <div className={styles.heroIcon}>🏆</div>
        <h1>Training abgeschlossen!</h1>
        <p className="text-muted text-sm">{plan.name} · {duration} Min.</p>
      </div>

      <div className={`card ${styles.summary}`}>
        <div className={styles.summaryHeader}>
          <h2>Zusammenfassung</h2>
          <button
            className={`btn btn-primary btn-sm ${copied ? styles.copied : ''}`}
            onClick={handleCopy}
          >
            {copied ? '✓ Kopiert!' : '📋 Kopieren'}
          </button>
        </div>
        <pre className={styles.text}>{text}</pre>
      </div>

      <div className={styles.hint}>
        <p>Kopiere den Text und sende ihn an deinen Google Health Coach.</p>
      </div>

      <button className="btn btn-secondary btn-full mt-4" onClick={onClose}>
        Zurück zur Übersicht
      </button>
    </div>
  )
}
