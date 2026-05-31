import styles from './ProgressChart.module.css'

export default function ProgressChart({ data }) {
  const W = 320
  const H = 160
  const padL = 40
  const padR = 12
  const padT = 12
  const padB = 32

  const weights = data.map(d => parseFloat(d.weight))
  const minW = Math.floor(Math.min(...weights) * 0.95)
  const maxW = Math.ceil(Math.max(...weights) * 1.05)

  const innerW = W - padL - padR
  const innerH = H - padT - padB

  function xPos(i) { return padL + (i / (data.length - 1)) * innerW }
  function yPos(w) { return padT + innerH - ((parseFloat(w) - minW) / (maxW - minW)) * innerH }

  const points = data.map((d, i) => `${xPos(i)},${yPos(d.weight)}`).join(' ')

  const ySteps = 4
  const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => {
    const v = minW + ((maxW - minW) / ySteps) * i
    return { y: yPos(v), label: v.toFixed(1) }
  })

  const xLabels = data.filter((_, i) => i === 0 || i === data.length - 1 || (data.length > 6 && i % Math.floor(data.length / 4) === 0))

  function formatDate(iso) {
    const d = new Date(iso)
    return `${d.getDate()}.${d.getMonth() + 1}.`
  }

  return (
    <div className={styles.wrap}>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg}>
        {yLabels.map(({ y, label }) => (
          <g key={label}>
            <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="var(--border)" strokeWidth="1" />
            <text x={padL - 4} y={y + 4} textAnchor="end" fontSize="10" fill="var(--text2)">{label}</text>
          </g>
        ))}

        <polyline
          points={points}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {data.map((d, i) => (
          <circle
            key={i}
            cx={xPos(i)}
            cy={yPos(d.weight)}
            r="4"
            fill="var(--accent)"
            stroke="var(--bg)"
            strokeWidth="2"
          />
        ))}

        {xLabels.map((d, idx) => {
          const i = data.indexOf(d)
          return (
            <text key={idx} x={xPos(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--text2)">
              {formatDate(d.date)}
            </text>
          )
        })}
      </svg>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className="text-xs text-muted">Start</span>
          <span className="font-bold">{weights[0]} kg</span>
        </div>
        <div className={styles.stat}>
          <span className="text-xs text-muted">Aktuell</span>
          <span className="font-bold">{weights[weights.length - 1]} kg</span>
        </div>
        <div className={styles.stat}>
          <span className="text-xs text-muted">Zuwachs</span>
          <span className={`font-bold ${weights[weights.length - 1] >= weights[0] ? 'text-accent' : ''}`}>
            {weights[weights.length - 1] >= weights[0] ? '+' : ''}{(weights[weights.length - 1] - weights[0]).toFixed(1)} kg
          </span>
        </div>
      </div>
    </div>
  )
}
