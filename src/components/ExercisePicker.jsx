import { useState, useEffect, useRef } from 'react'
import { searchExercises } from '../services/api.js'
import styles from './ExercisePicker.module.css'

export default function ExercisePicker({ onSelect, onCancel, existingNames = [] }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [muscleGroup, setMuscleGroup] = useState('')
  const timerRef = useRef(null)

  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (query.length >= 1) {
        setLoading(true)
        searchExercises(query)
          .then(r => setResults(r.filter(e => !existingNames.includes(e.name))))
          .catch(() => setResults([]))
          .finally(() => setLoading(false))
      } else {
        setResults([])
      }
    }, 300)
  }, [query])

  function handleSelect(ex) {
    onSelect({ exercise_id: ex.id, exercise_name: ex.name, muscle_group: ex.muscle_group || '', default_sets: 3 })
  }

  function handleAddNew() {
    if (!query.trim()) return
    onSelect({ exercise_name: query.trim(), muscle_group: muscleGroup.trim(), default_sets: 3 })
  }

  const showAddNew = query.trim().length > 0 && !results.some(r => r.name.toLowerCase() === query.trim().toLowerCase())

  return (
    <div className={`card ${styles.picker}`}>
      <div className={styles.pickerHeader}>
        <h3>Übung hinzufügen</h3>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>✕</button>
      </div>

      <input
        type="text"
        placeholder="Übung suchen oder eingeben..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        autoFocus
        className={styles.search}
      />

      {loading && <div className="text-sm text-muted mt-2">Suche...</div>}

      {results.length > 0 && (
        <div className={styles.results}>
          {results.map(ex => (
            <button key={ex.id} className={styles.resultItem} onClick={() => handleSelect(ex)}>
              <span>{ex.name}</span>
              {ex.muscle_group && <span className="text-xs text-muted">{ex.muscle_group}</span>}
            </button>
          ))}
        </div>
      )}

      {showAddNew && (
        <div className={styles.addNew}>
          <p className="text-sm mb-2">
            <strong>"{query.trim()}"</strong> neu hinzufügen:
          </p>
          <input
            type="text"
            placeholder="Muskelgruppe (optional)"
            value={muscleGroup}
            onChange={e => setMuscleGroup(e.target.value)}
            className={styles.muscleInput}
          />
          <button className="btn btn-primary btn-sm w-full mt-2" onClick={handleAddNew}>
            + Hinzufügen
          </button>
        </div>
      )}
    </div>
  )
}
