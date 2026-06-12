import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { acceptInvitation } from '../../services/api.js'
import { supabase } from '../../lib/supabase.js'
import RegisterPage from './RegisterPage.jsx'
import styles from './AuthPage.module.css'

// Einladungslink des Coaches: /#/invite/<code>
// Neuer Kunde registriert sich (Rolle client) oder meldet sich an,
// danach wird die Einladung per RPC angenommen.
export default function InvitePage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [mode, setMode] = useState('register') // 'register' | 'login'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function accept() {
    setBusy(true)
    setError(null)
    try {
      await acceptInvitation(code)
      navigate('/', { replace: true })
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setBusy(false)
      return setError(err.message === 'Invalid login credentials' ? 'E-Mail oder Passwort falsch.' : err.message)
    }
    await accept()
  }

  if (loading) return null

  // Bereits angemeldet → Einladung direkt annehmen
  if (user) {
    return (
      <div className={styles.wrap}>
        <div className={styles.header}>
          <div className={styles.logo}>🤝</div>
          <h1>Coach-Einladung</h1>
          <p className="text-muted text-sm">Du wurdest eingeladen, einem Coach beizutreten.</p>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <button className="btn btn-primary btn-full" onClick={accept} disabled={busy}>
          {busy ? '...' : 'Einladung annehmen'}
        </button>
      </div>
    )
  }

  if (mode === 'register') {
    return (
      <div>
        <RegisterPage role="client" onRegistered={accept} />
        <p className={styles.switchLink}>
          Schon ein Konto?{' '}
          <a onClick={() => setMode('login')} style={{ cursor: 'pointer' }}>Anmelden und Einladung annehmen</a>
        </p>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.logo}>🤝</div>
        <h1>Coach-Einladung</h1>
        <p className="text-muted text-sm">Anmelden und Einladung annehmen</p>
      </div>

      <form className="card" onSubmit={handleLogin}>
        <div className="form-group">
          <label className="label">E-Mail</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="label">Passwort</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        {error && <div className="error-msg">{error}</div>}
        <div className={styles.actions}>
          <button type="submit" className="btn btn-primary btn-full" disabled={busy}>
            {busy ? '...' : 'Anmelden & beitreten'}
          </button>
        </div>
      </form>

      <p className={styles.switchLink}>
        Neu hier? <a onClick={() => setMode('register')} style={{ cursor: 'pointer' }}>Konto erstellen</a>
      </p>
    </div>
  )
}
