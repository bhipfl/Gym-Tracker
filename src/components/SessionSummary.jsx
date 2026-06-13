import { useState } from 'react'
import { Trophy, Save, Share2, ClipboardCopy, Check, Flame, Dumbbell, Layers, Clock } from 'lucide-react'
import styles from './SessionSummary.module.css'

const toNum = (v) => {
  const n = parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}
const toInt = (v) => Math.round(toNum(v))
// Deutsche Anzeige: ganze Zahl ohne Nachkomma, sonst mit Komma
const fmtW = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10).replace('.', ','))

// Aggregiert die Trainingsdaten zu Kennzahlen + Übungszeilen
function computeSummary(exercises, sessionData, lastWeights) {
  let totalVolume = 0
  let totalSets = 0
  let strongerCount = 0
  const rows = []

  for (const ex of exercises) {
    const done = (sessionData[ex.id] || []).filter((s) => s.done)
    if (done.length === 0) continue
    totalSets += done.length

    let best = null
    for (const s of done) {
      if (s.weight !== '' && s.reps !== '') totalVolume += toNum(s.weight) * toInt(s.reps)
      const w = toNum(s.weight)
      if (s.weight !== '' && (!best || w > toNum(best.weight))) best = s
    }

    const last = lastWeights?.[ex.exercise_name]
    let stronger = false
    if (best && last) {
      const lastBest = Math.max(0, ...Object.values(last).map((l) => toNum(l.weight)))
      if (toNum(best.weight) > lastBest && lastBest > 0) stronger = true
    }
    if (stronger) strongerCount++

    rows.push({ name: ex.exercise_name, sets: done.length, best, stronger })
  }

  return { totalVolume, totalSets, exercisesTrained: rows.length, strongerCount, rows }
}

function buildText(plan, date, rows) {
  const dateStr = date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const lines = [`Training vom ${dateStr} – ${plan.name}`, '']
  let totalVolume = 0
  for (const r of rows) {
    lines.push(`${r.name}:`)
    // Originaldaten erneut durchlaufen wäre nötig — hier nutzen wir die Zeilen-Sets
    r._sets.forEach((s, i) => {
      const w = s.weight || '–'
      const reps = s.reps || '–'
      lines.push(`  Satz ${i + 1}: ${w} kg × ${reps} Wdh`)
      if (s.weight && s.reps) totalVolume += toNum(s.weight) * toInt(s.reps)
    })
    lines.push('')
  }
  if (totalVolume > 0) lines.push(`Gesamtvolumen: ${totalVolume.toLocaleString('de-DE')} kg`)
  return lines.join('\n').trim()
}

// Zeichnet eine teilbare Trainingskarte (1080×1080) im Graphit/Volt-Look
function drawShareCard({ title, dateStr, totalVolume, totalSets, duration, rows }) {
  const S = 1080
  const c = document.createElement('canvas')
  c.width = S
  c.height = S
  const ctx = c.getContext('2d')
  const font = (w, px) => `${w} ${px}px -apple-system, "Segoe UI", system-ui, sans-serif`

  ctx.fillStyle = '#0c0e12'
  ctx.fillRect(0, 0, S, S)

  const pad = 80
  ctx.textBaseline = 'alphabetic'

  ctx.fillStyle = '#c9f73a'
  ctx.font = font(700, 30)
  ctx.fillText('GYM TRACKER', pad, pad + 10)

  ctx.fillStyle = '#f2f4f6'
  ctx.font = font(700, 68)
  ctx.fillText(title.length > 22 ? title.slice(0, 21) + '…' : title, pad, pad + 96)

  ctx.fillStyle = '#8a929e'
  ctx.font = font(400, 30)
  ctx.fillText(dateStr, pad, pad + 142)

  // Stat-Kacheln
  const tiles = [
    { v: totalVolume.toLocaleString('de-DE'), u: 'kg Volumen' },
    { v: String(totalSets), u: 'Sätze' },
    { v: duration != null ? String(duration) : String(rows.length), u: duration != null ? 'Minuten' : 'Übungen' },
  ]
  const tw = (S - pad * 2 - 40) / 3
  const ty = pad + 200
  tiles.forEach((t, i) => {
    const tx = pad + i * (tw + 20)
    ctx.fillStyle = '#161a20'
    roundRect(ctx, tx, ty, tw, 180, 24)
    ctx.fill()
    ctx.fillStyle = '#c9f73a'
    ctx.font = font(700, 58)
    ctx.textAlign = 'center'
    ctx.fillText(t.v, tx + tw / 2, ty + 92)
    ctx.fillStyle = '#8a929e'
    ctx.font = font(600, 26)
    ctx.fillText(t.u, tx + tw / 2, ty + 134)
    ctx.textAlign = 'left'
  })

  // Übungsliste
  let y = ty + 180 + 80
  ctx.font = font(700, 30)
  ctx.fillStyle = '#8a929e'
  ctx.fillText('ÜBUNGEN', pad, y)
  y += 50
  rows.slice(0, 7).forEach((r) => {
    ctx.fillStyle = '#f2f4f6'
    ctx.font = font(600, 36)
    const name = r.name.length > 26 ? r.name.slice(0, 25) + '…' : r.name
    ctx.fillText(name, pad, y)
    if (r.best) {
      const bestStr = `${fmtW(toNum(r.best.weight))} kg × ${r.best.reps}`
      ctx.fillStyle = r.stronger ? '#c9f73a' : '#8a929e'
      ctx.font = font(600, 34)
      ctx.textAlign = 'right'
      ctx.fillText((r.stronger ? '↑ ' : '') + bestStr, S - pad, y)
      ctx.textAlign = 'left'
    }
    y += 64
  })

  ctx.fillStyle = '#c9f73a'
  roundRect(ctx, pad, S - pad - 8, S - pad * 2, 8, 4)
  ctx.fill()
  return c
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export default function SessionSummary({ plan, date, exercises, sessionData, lastWeights, isEdit, onClose }) {
  const [copied, setCopied] = useState(false)
  const [shareMsg, setShareMsg] = useState(null)

  const summary = computeSummary(exercises, sessionData, lastWeights)
  // Sets pro Zeile für den Kopiertext anreichern
  summary.rows.forEach((r) => {
    const ex = exercises.find((e) => e.exercise_name === r.name)
    r._sets = (sessionData[ex.id] || []).filter((s) => s.done)
  })
  const text = buildText(plan, date, summary.rows)
  const duration = isEdit ? null : Math.max(1, Math.round((new Date() - date) / 60000))
  const hasData = summary.totalSets > 0

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      Object.assign(ta.style, { position: 'fixed', opacity: 0 })
      document.body.appendChild(ta)
      ta.focus(); ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleShare() {
    const dateStr = date.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
    const canvas = drawShareCard({
      title: plan.name, dateStr,
      totalVolume: summary.totalVolume, totalSets: summary.totalSets, duration, rows: summary.rows,
    })
    canvas.toBlob(async (blob) => {
      if (!blob) return
      const file = new File([blob], 'training.png', { type: 'image/png' })
      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'Mein Training', text: `${plan.name} – ${summary.totalVolume.toLocaleString('de-DE')} kg Volumen` })
          return
        }
      } catch {
        return // Nutzer hat Teilen abgebrochen
      }
      // Fallback: Bild herunterladen
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'training.png'
      a.click()
      URL.revokeObjectURL(url)
      setShareMsg('Bild gespeichert')
      setTimeout(() => setShareMsg(null), 2500)
    }, 'image/png')
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.hero}>
        <div className={styles.heroIcon}>
          {isEdit ? <Save size={52} strokeWidth={1.5} /> : <Trophy size={52} strokeWidth={1.5} />}
        </div>
        <h1>{isEdit ? 'Änderungen gespeichert!' : 'Training abgeschlossen!'}</h1>
        <p className="text-muted text-sm">
          {plan.name}
          {duration != null && ` · ${duration} Min.`}
        </p>
      </div>

      {hasData && (
        <div className={styles.statGrid}>
          <div className={styles.stat}>
            <Dumbbell size={18} className={styles.statIcon} />
            <div className={styles.statValue}>{summary.totalVolume.toLocaleString('de-DE')}</div>
            <div className={styles.statLabel}>kg Volumen</div>
          </div>
          <div className={styles.stat}>
            <Layers size={18} className={styles.statIcon} />
            <div className={styles.statValue}>{summary.totalSets}</div>
            <div className={styles.statLabel}>Sätze</div>
          </div>
          <div className={styles.stat}>
            <Clock size={18} className={styles.statIcon} />
            <div className={styles.statValue}>{duration != null ? duration : summary.exercisesTrained}</div>
            <div className={styles.statLabel}>{duration != null ? 'Minuten' : 'Übungen'}</div>
          </div>
        </div>
      )}

      {summary.strongerCount > 0 && (
        <div className={styles.prCard}>
          <Flame size={20} strokeWidth={2.5} />
          <span>
            In <strong>{summary.strongerCount}</strong> {summary.strongerCount === 1 ? 'Übung' : 'Übungen'} stärker als beim letzten Mal
          </span>
        </div>
      )}

      {hasData ? (
        <div className={styles.exList}>
          {summary.rows.map((r, i) => (
            <div key={i} className={styles.exRow}>
              <div className={styles.exMain}>
                <span className={styles.exName}>{r.name}</span>
                <span className={styles.exSets}>{r.sets} {r.sets === 1 ? 'Satz' : 'Sätze'}</span>
              </div>
              {r.best && (
                <span className={`${styles.exBest} ${r.stronger ? styles.exBestPr : ''}`}>
                  {r.stronger && <Flame size={13} strokeWidth={2.5} />}
                  {fmtW(toNum(r.best.weight))} kg × {r.best.reps}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center text-muted text-sm">Keine Sätze abgehakt.</div>
      )}

      {hasData && (
        <div className={styles.actions}>
          <button className="btn btn-primary btn-full" onClick={handleShare}>
            <Share2 size={16} /> Training teilen
          </button>
          <button className={`btn btn-secondary btn-full ${copied ? styles.copied : ''}`} onClick={handleCopy}>
            {copied ? <><Check size={16} /> Kopiert!</> : <><ClipboardCopy size={16} /> Text kopieren</>}
          </button>
        </div>
      )}
      {shareMsg && <div className="success-msg mt-2" style={{ textAlign: 'center' }}>{shareMsg}</div>}

      {!isEdit && hasData && (
        <p className={styles.hint}>Text kopieren & an deinen Google Health Coach senden.</p>
      )}

      <button className="btn btn-ghost btn-full mt-4" onClick={onClose}>
        {isEdit ? 'Zurück zum Verlauf' : 'Zurück zur Übersicht'}
      </button>
    </div>
  )
}
