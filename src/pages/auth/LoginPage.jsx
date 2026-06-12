import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabase.js'
import styles from './AuthPage.module.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) return setError(err.message === 'Invalid login credentials' ? 'E-Mail oder Passwort falsch.' : err.message)
    navigate(location.state?.from || '/', { replace: true })
  }

  if (!isSupabaseConfigured) {
    return (
      <div className={styles.wrap}>
        <div className="error-msg">
          Supabase ist nicht konfiguriert. <code>VITE_SUPABASE_URL</code> und{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> beim Build setzen (siehe <code>supabase/README.md</code>).
        </div>
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.logo}>💪</div>
        <h1>Gym Tracker</h1>
        <p className="text-muted text-sm">Anmelden</p>
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="label">E-Mail</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        <div className="form-group">
          <label className="label">Passwort</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
        </div>

        {error && <div className="error-msg">{error}</div>}

        <div className={styles.actions}>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? '...' : 'Anmelden'}
          </button>
        </div>
      </form>

      <p className={styles.switchLink}>
        Noch kein Konto? <Link to="/register">Als Coach registrieren</Link>
      </p>
    </div>
  )
}
