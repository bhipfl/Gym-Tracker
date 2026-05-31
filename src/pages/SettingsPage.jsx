import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getConfig, saveConfig, clearConfig } from '../services/storage.js'
import { testConnection } from '../services/api.js'
import styles from './SettingsPage.module.css'

export default function SettingsPage() {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const cfg = getConfig()
    if (cfg) { setUrl(cfg.url || ''); setToken(cfg.token || '') }
  }, [])

  async function handleTest() {
    if (!url) return setStatus({ type: 'error', msg: 'Bitte URL eingeben.' })
    setLoading(true)
    setStatus(null)
    const tempCfg = { url, token }
    saveConfig(tempCfg)
    try {
      await testConnection()
      setStatus({ type: 'success', msg: '✅ Verbindung erfolgreich!' })
    } catch (e) {
      setStatus({ type: 'error', msg: `❌ Fehler: ${e.message}` })
    } finally {
      setLoading(false)
    }
  }

  function handleSave() {
    if (!url) return setStatus({ type: 'error', msg: 'Bitte URL eingeben.' })
    saveConfig({ url, token })
    setStatus({ type: 'success', msg: 'Gespeichert!' })
    setTimeout(() => navigate('/'), 800)
  }

  function handleReset() {
    clearConfig()
    setUrl('')
    setToken('')
    setStatus(null)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.logo}>💪</div>
        <h1>Gym Tracker</h1>
        <p className="text-muted text-sm">Verbinde dein Google Sheets Backend</p>
      </div>

      <div className="card">
        <div className="form-group">
          <label className="label">Apps Script URL</label>
          <input
            type="url"
            placeholder="https://script.google.com/macros/s/.../exec"
            value={url}
            onChange={e => setUrl(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="form-group">
          <label className="label">Token / Passwort</label>
          <input
            type="password"
            placeholder="Dein geheimes Token"
            value={token}
            onChange={e => setToken(e.target.value)}
            autoComplete="new-password"
          />
          <p className="text-xs text-muted mt-2">
            Wird nur in diesem Browser gespeichert, nicht im Code.
          </p>
        </div>

        {status && (
          <div className={status.type === 'success' ? 'success-msg' : 'error-msg'}>
            {status.msg}
          </div>
        )}

        <div className={styles.actions}>
          <button className="btn btn-secondary" onClick={handleTest} disabled={loading}>
            {loading ? '...' : '🔌 Testen'}
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={!url}>
            💾 Speichern
          </button>
        </div>

        {getConfig() && (
          <button className="btn btn-ghost btn-sm mt-3 w-full" onClick={handleReset}>
            Verbindung trennen
          </button>
        )}
      </div>

      <div className={`card ${styles.help}`}>
        <h3>📖 Setup-Anleitung</h3>
        <ol>
          <li>Erstelle ein Google Sheet</li>
          <li>Öffne Extensions → Apps Script</li>
          <li>Füge den Code aus <code>apps-script/Code.gs</code> ein</li>
          <li>Setze Script Properties: <code>SPREADSHEET_ID</code> + <code>TOKEN</code></li>
          <li>Deploy als Web App (Execute as: Me, Access: Anyone)</li>
          <li>URL und Token hier eingeben</li>
        </ol>
        <p className="text-xs text-muted mt-3">
          Details: <code>apps-script/README.md</code> im Repository
        </p>
      </div>
    </div>
  )
}
