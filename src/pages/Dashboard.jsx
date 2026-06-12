import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Settings, Dumbbell, Check, CloudUpload } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { usePlans, useSessions, keys } from '../hooks/queries.js'
import { getOfflineQueue } from '../services/storage.js'
import { syncOfflineQueue } from '../services/sync.js'
import { SkeletonPage } from '../components/Skeleton.jsx'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const { role } = useAuth()
  const qc = useQueryClient()
  const plansQuery = usePlans()
  const sessionsQuery = useSessions(5)
  const [offlineCount, setOfflineCount] = useState(getOfflineQueue().length)
  const [syncMsg, setSyncMsg] = useState(null)

  const plans = plansQuery.data || []
  const sessions = sessionsQuery.data || []
  const loading = (plansQuery.isPending && !plansQuery.data) || (sessionsQuery.isPending && !sessionsQuery.data)
  const error = plansQuery.error?.message || sessionsQuery.error?.message

  useEffect(() => {
    // Flush offline queue in background
    if (getOfflineQueue().length > 0 && navigator.onLine) {
      syncOfflineQueue().then(({ synced }) => {
        if (synced > 0) {
          setOfflineCount(getOfflineQueue().length)
          setSyncMsg(`${synced} Training${synced > 1 ? 's' : ''} synchronisiert`)
          setTimeout(() => setSyncMsg(null), 4000)
          qc.invalidateQueries({ queryKey: keys.allSessions })
        }
      }).catch(() => {})
    }
  }, [qc])

  function formatDate(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  if (loading) return <SkeletonPage count={3} />

  return (
    <div className="page">
      <div className={styles.greeting}>
        <div>
          <h1 className={styles.title}>Gutes Training!</h1>
          <p className="text-muted text-sm">{new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/settings')} aria-label="Einstellungen"><Settings size={20} /></button>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {syncMsg && <div className="success-msg">{syncMsg}</div>}

      {offlineCount > 0 && (
        <div className={styles.offlineBanner}>
          <CloudUpload size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} />
          {offlineCount} Training{offlineCount > 1 ? 's' : ''} warten auf Synchronisierung
        </div>
      )}

      <section className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className={styles.section}>Trainingspläne</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/plans')}>Alle →</button>
        </div>
        {plans.length === 0 ? (
          <div className="card text-center">
            <p className="text-muted text-sm mb-3">
              {role === 'client'
                ? 'Dein Coach hat dir noch keinen Plan zugewiesen — du kannst auch selbst einen erstellen.'
                : 'Noch kein Plan angelegt.'}
            </p>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/plans')}>
              {role === 'client' ? 'Eigenen Plan erstellen' : 'Plan erstellen'}
            </button>
          </div>
        ) : (
          <div className={styles.planGrid}>
            {plans.slice(0, 4).map(plan => (
              <button
                key={plan.id}
                className={styles.planBtn}
                onClick={() => navigate(`/session/${plan.id}`, { state: { plan } })}
              >
                <span className={styles.planIcon}><Dumbbell size={24} /></span>
                <span className={styles.planName}>{plan.name}</span>
                <span className={styles.startLabel}>Starten →</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className={styles.section}>Letztes Training</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/history')}>Alle →</button>
        </div>
        {sessions.length === 0 ? (
          <div className="card">
            <p className="text-muted text-sm">Noch kein Training aufgezeichnet.</p>
          </div>
        ) : (
          <div className={styles.sessionList}>
            {sessions.slice(0, 3).map(s => (
              <div key={s.id} className={`card ${styles.sessionCard}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className={styles.sessionPlan}>{s.plan_name || 'Training'}</div>
                    <div className="text-xs text-muted">{formatDate(s.date)}</div>
                  </div>
                  <span className="badge"><Check size={12} strokeWidth={3} /></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
