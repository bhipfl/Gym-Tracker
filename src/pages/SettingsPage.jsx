import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { User, Timer, Save, ArrowLeft } from 'lucide-react'
import { getConfig, saveConfig } from '../services/storage.js'
import { useAuth } from '../context/AuthContext.jsx'
import BrandMark from '../components/BrandMark.jsx'
import styles from './SettingsPage.module.css'

export default function SettingsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user, profile, role, signOut } = useAuth()
  const [restSeconds, setRestSeconds] = useState(90)
  const [status, setStatus] = useState(null)

  useEffect(() => {
    setRestSeconds(Number(getConfig()?.restSeconds) || 90)
  }, [])

  function handleSaveTraining() {
    saveConfig({ ...getConfig(), restSeconds: Number(restSeconds) || 90 })
    setStatus('Gespeichert!')
    setTimeout(() => setStatus(null), 2000)
  }

  async function handleLogout() {
    await signOut()
    qc.clear()
    navigate('/login', { replace: true })
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.logo}><BrandMark size={48} /></div>
        <h1>Gym Tracker</h1>
      </div>

      <div className="card">
        <h3 className="mb-3 flex items-center gap-2"><User size={18} /> Konto</h3>
        <div className="form-group">
          <label className="label">Name</label>
          <div>{profile?.display_name || '–'}</div>
        </div>
        <div className="form-group">
          <label className="label">E-Mail</label>
          <div>{user?.email || '–'}</div>
        </div>
        <div className="form-group">
          <label className="label">Rolle</label>
          <span className="badge">{role === 'coach' ? 'Coach' : 'Klient'}</span>
        </div>
        <button className="btn btn-secondary w-full" onClick={handleLogout}>
          Abmelden
        </button>
      </div>

      <div className="card mt-3">
        <h3 className="mb-3 flex items-center gap-2"><Timer size={18} /> Training</h3>
        <div className="form-group">
          <label className="label">Pausen-Timer (Sekunden)</label>
          <input
            type="number"
            min="15"
            max="600"
            step="15"
            value={restSeconds}
            onChange={e => setRestSeconds(e.target.value)}
          />
          <p className="text-xs text-muted mt-2">
            Startet automatisch, wenn du einen Satz abhakst.
          </p>
        </div>
        {status && <div className="success-msg">{status}</div>}
        <button className="btn btn-primary btn-sm" onClick={handleSaveTraining}>
          <Save size={16} /> Speichern
        </button>
      </div>

      <button className="btn btn-ghost btn-sm mt-3 w-full" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} /> Zurück
      </button>

      <p className="text-xs text-muted mt-3" style={{ textAlign: 'center' }}>
        Übungsbilder & -daten: <a href="https://wger.de" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>wger.de</a> (CC-BY-SA 4.0)
      </p>
    </div>
  )
}
