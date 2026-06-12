import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessions, useSessionSets, useDeleteSession } from '../hooks/queries.js'
import { SkeletonPage } from '../components/Skeleton.jsx'
import styles from './HistoryPage.module.css'

export default function HistoryPage() {
  const navigate = useNavigate()
  const sessionsQuery = useSessions(100)
  const deleteSession = useDeleteSession()
  const [expanded, setExpanded] = useState(null)

  const sessions = sessionsQuery.data || []
  const error = sessionsQuery.error?.message || deleteSession.error?.message

  function toggleExpand(session) {
    setExpanded(expanded === session.id ? null : session.id)
  }

  function handleDelete(session) {
    if (!confirm(`Training vom ${formatDate(session.date)} wirklich löschen?`)) return
    if (expanded === session.id) setExpanded(null)
    deleteSession.mutate(session.id)
  }

  if (sessionsQuery.isPending && !sessionsQuery.data) return <SkeletonPage count={6} />

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
                <SessionDetail
                  session={session}
                  onEdit={() => navigate(`/edit-session/${session.id}`, { state: { session } })}
                  onDelete={() => handleDelete(session)}
                  deleting={deleteSession.isPending && deleteSession.variables === session.id}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SessionDetail({ session, onEdit, onDelete, deleting }) {
  const setsQuery = useSessionSets(session.id)
  const sets = setsQuery.data || []

  return (
    <div className={styles.detail}>
      {session.notes && (
        <div className={styles.sessionNotes}>💬 {session.notes}</div>
      )}
      {setsQuery.isPending ? (
        <div className="text-sm text-muted">Lade...</div>
      ) : sets.length > 0 ? (
        Object.entries(groupSets(sets)).map(([name, exSets]) => (
          <div key={name} className={styles.exGroup}>
            <div className={styles.exName}>{name}</div>
            {exSets.sort((a, b) => Number(a.set_number) - Number(b.set_number)).map((s, i) => (
              <div key={i} className={styles.setLine}>
                Satz {s.set_number}: {s.weight} kg × {s.reps} Wdh
              </div>
            ))}
          </div>
        ))
      ) : (
        <div className="text-sm text-muted">Keine Sets aufgezeichnet.</div>
      )}

      <div className={styles.detailActions}>
        <button className="btn btn-secondary btn-sm" onClick={onEdit}>
          ✏️ Bearbeiten
        </button>
        <button className="btn btn-danger btn-sm" onClick={onDelete} disabled={deleting}>
          {deleting ? '...' : '🗑️ Löschen'}
        </button>
      </div>
    </div>
  )
}

function groupSets(sets) {
  const grouped = {}
  sets.forEach(s => {
    if (!grouped[s.exercise_name]) grouped[s.exercise_name] = []
    grouped[s.exercise_name].push(s)
  })
  return grouped
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
}
