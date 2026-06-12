import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import styles from './AuthPage.module.css'

// Registrierung als Coach. Kunden registrieren sich über einen Einladungslink
// (/invite/:code) und bekommen dort die Rolle "client".
export default function RegisterPage({ role = 'coach', onRegistered }) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) return setError('Passwort braucht mindestens 8 Zeichen.')
    setLoading(true)
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role, display_name: name.trim() || email.split('@')[0] } },
    })
    setLoading(false)
    if (err) return setError(err.message)
    if (onRegistered) return onRegistered()
    navigate('/', { replace: true })
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.logo}>💪</div>
        <h1>Gym Tracker</h1>
        <p className="text-muted text-sm">
          {role === 'coach' ? 'Coach-Konto erstellen' : 'Konto erstellen'}
        </p>
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="label">Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
        </div>
        <div className="form-group">
          <label className="label">E-Mail</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
        </div>
        <div className="form-group">
          <label className="label">Passwort (min. 8 Zeichen)</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" required />
        </div>

        {error && <div className="error-msg">{error}</div>}

        <div className={styles.actions}>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? '...' : 'Registrieren'}
          </button>
        </div>
      </form>

      {!onRegistered && (
        <p className={styles.switchLink}>
          Schon ein Konto? <Link to="/login">Anmelden</Link>
        </p>
      )}
    </div>
  )
}
