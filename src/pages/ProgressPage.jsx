import { useEffect, useState } from 'react'
import { getExerciseProgress } from '../services/api.js'
import ProgressChart from '../components/ProgressChart.jsx'
import styles from './ProgressPage.module.css'

export default function ProgressPage() {
  const [selected, setSelected] = useState(null)
  const [progress, setProgress] = useState([])
  const [chartLoading, setChartLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSelectExercise(name) {
    setSelected(name)
    setChartLoading(true)
    setError(null)
    try {
      const data = await getExerciseProgress(name)
      setProgress(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setChartLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="page-title">Fortschritt</div>

      {error && <div className="error-msg">{error}</div>}

      <div className="form-group">
        <label className="label">Übung auswählen</label>
        <ExerciseInput onSelect={handleSelectExercise} />
      </div>

      {selected && (
        <div className="card mt-3">
          <h2 className={styles.chartTitle}>{selected}</h2>
          <p className="text-xs text-muted mb-3">Maximales Gewicht pro Training</p>
          {chartLoading ? (
            <div className="spinner" />
          ) : progress.length < 2 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <p>Noch nicht genug Daten.<br />Mindestens 2 Trainings mit dieser Übung nötig.</p>
            </div>
          ) : (
            <ProgressChart data={progress} />
          )}
        </div>
      )}

      {!selected && (
        <div className="empty-state">
          <div className="icon">📈</div>
          <h3>Übung auswählen</h3>
          <p>Gib eine Übung ein, um deine Gewichtsentwicklung zu sehen.</p>
        </div>
      )}
    </div>
  )
}

function ExerciseInput({ onSelect }) {
  const [value, setValue] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (value.trim()) onSelect(value.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        placeholder="z.B. Bankdrücken"
        value={value}
        onChange={e => setValue(e.target.value)}
      />
      <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }}>
        Anzeigen
      </button>
    </form>
  )
}
