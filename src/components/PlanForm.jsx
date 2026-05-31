import { useState } from 'react'
import styles from './PlanForm.module.css'

export default function PlanForm({ plan, onSave, onCancel }) {
  const [name, setName] = useState(plan?.name || '')
  const [description, setDescription] = useState(plan?.description || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return setError('Name ist erforderlich.')
    setLoading(true)
    setError(null)
    try {
      await onSave({ ...plan, name: name.trim(), description: description.trim() })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`card ${styles.form}`}>
      <h3 className={styles.title}>{plan ? 'Plan bearbeiten' : 'Neuer Trainingsplan'}</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="label">Name *</label>
          <input
            type="text"
            placeholder="z.B. Push Day, Beine, Ganzkörper..."
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div className="form-group">
          <label className="label">Beschreibung (optional)</label>
          <input
            type="text"
            placeholder="z.B. Brust, Schultern, Trizeps"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>
        {error && <div className="error-msg">{error}</div>}
        <div className={styles.actions}>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>Abbrechen</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '...' : plan ? 'Speichern' : 'Erstellen'}
          </button>
        </div>
      </form>
    </div>
  )
}
