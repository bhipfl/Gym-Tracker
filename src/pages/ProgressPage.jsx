import { useEffect, useState, useRef } from 'react'
import { getExerciseProgress, getUsedExerciseNames } from '../services/api.js'
import ProgressChart from '../components/ProgressChart.jsx'
import styles from './ProgressPage.module.css'

export default function ProgressPage() {
  const [exerciseNames, setExerciseNames] = useState([])
  const [selected, setSelected] = useState(null)
  const [progress, setProgress] = useState([])
  const [chartLoading, setChartLoading] = useState(false)
  const [namesLoading, setNamesLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getUsedExerciseNames()
      .then(setExerciseNames)
      .catch(() => {})
      .finally(() => setNamesLoading(false))
  }, [])

  async function handleSelect(name) {
    setSelected(name)
    setChartLoading(true)
    setError(null)
    try {
      setProgress(await getExerciseProgress(name))
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
        <ExerciseSearch names={exerciseNames} loading={namesLoading} onSelect={handleSelect} selected={selected} />
      </div>

      {selected && (
        <div className="card mt-3">
          <h2 className={styles.chartTitle}>{selected}</h2>
          <p className="text-xs text-muted mb-3">Maximales Gewicht pro Training</p>
          {chartLoading ? (
            <div className="spinner" />
          ) : progress.length < 2 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <p>Mindestens 2 Trainings mit dieser Übung nötig.</p>
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
          <p>Wähle eine Übung, um deine Gewichtsentwicklung zu sehen.</p>
        </div>
      )}
    </div>
  )
}

function ExerciseSearch({ names, loading, onSelect, selected }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const filtered = query.trim()
    ? names.filter(n => n.toLowerCase().includes(query.toLowerCase()))
    : names

  useEffect(() => {
    function onClick(e) { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function handlePick(name) {
    setQuery(name)
    setOpen(false)
    onSelect(name)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (query.trim()) { setOpen(false); onSelect(query.trim()) }
  }

  return (
    <div ref={ref} className={styles.searchWrap}>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            placeholder={loading ? 'Lade Übungen...' : 'Übung suchen oder eingeben...'}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            disabled={loading}
          />
          {open && filtered.length > 0 && (
            <div className={styles.dropdown}>
              {filtered.slice(0, 12).map(name => (
                <button
                  key={name}
                  type="button"
                  className={`${styles.dropItem} ${name === selected ? styles.dropActive : ''}`}
                  onClick={() => handlePick(name)}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }}>
          Anzeigen
        </button>
      </form>
    </div>
  )
}
