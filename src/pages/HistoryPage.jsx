import { useEffect, useState } from 'react'
import { getSessions, getSessionSets } from '../services/api.js'
import styles from './HistoryPage.module.css'

export default function HistoryPage() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [sets, setSets] = useState({})
  const [loadingSets, setLoadingSets] = useState(null)

  useEffect(() => {
    getSessions(100)
      .then(setSessions)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function toggleExpand(session) {
    if (expanded === session.id) { setExpanded(null); return }
    setExpanded(session.id)
    if (!sets[session.id]) {
      setLoadingSets(session.id)
      try {
        const s = await getSessionSets(session.id)
        setSets(prev => ({ ...prev, [session.id]: s }))
      } catch (_) {}
      setLoadingSets(null)
    }
  }

  function formatDate(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  function groupSets(sets) {
    const grouped = {}
    sets.forEach(s => {
      if (!grouped[s.exercise_name]) grouped[s.exercise_name] = []
      grouped[s.exercise_name].push(s)
    })
    return grouped
  }

  if (loading) return <div className="page"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="page-title">Trainingsverlauf</div>

      {error && <div className="error-msg">{error}</div>}

      {sessions.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📅</div>
          <h3>Noch kein Training</h3>
          <p>Starte dein erstes Training über die Pläne.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {sessions.map(session => (
            <div key={session.id} className="card">
              <button className={styles.sessionRow} onClick={() => toggleExpand(session)}>
                <div>
                  <div className={styles.sessionName}>{session.plan_name || 'Training'}</div>
                  <div className="text-xs text-muted">{formatDate(session.date)}</div>
                </div>
                <span className={styles.arrow}>{expanded === session.id ? '▲' : '▼'}</span>
              </button>

              {expanded === session.id && (
                <div className={styles.detail}>
                  {loadingSets === session.id ? (
                    <div className="text-sm text-muted">Lade...</div>
                  ) : sets[session.id]?.length > 0 ? (
                    Object.entries(groupSets(sets[session.id])).map(([name, exSets]) => (
                      <div key={name} className={styles.exGroup}>
                        <div className={styles.exName}>{name}</div>
                        {exSets.sort((a, b) => a.set_number - b.set_number).map(s => (
                          <div key={s.id} className={styles.setLine}>
                            Satz {s.set_number}: {s.weight} kg × {s.reps} Wdh
                          </div>
                        ))}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted">Keine Sets aufgezeichnet.</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
