import { useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import {
  useClientNotes, useAddClientNote, useDeleteClientNote,
  useClientPlans, useClientSessions, useClientExerciseNames, useClientProgress,
  usePlans, useAssignPlanToClient, useSessionSets,
} from '../../hooks/queries.js'
import ProgressChart from '../../components/ProgressChart.jsx'
import { SkeletonPage } from '../../components/Skeleton.jsx'
import styles from './ClientDetailPage.module.css'

const TABS = [
  { id: 'akte', label: '📋 Akte' },
  { id: 'training', label: '📅 Training' },
  { id: 'progress', label: '📈 Fortschritt' },
]

export default function ClientDetailPage() {
  const { id: clientId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const client = location.state?.client || { id: clientId, name: 'Klient' }
  const [tab, setTab] = useState('akte')

  return (
    <div className="page">
      <div className={styles.header}>
        <button className="btn btn-ghost" onClick={() => navigate('/coach')}>← Zurück</button>
        <h1 className={styles.title}>{client.name}</h1>
      </div>

      <div className={styles.tabs}>
        {TABS.map(t => (
          <button
            key={t.id}
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'akte' && <AkteTab clientId={clientId} />}
      {tab === 'training' && <TrainingTab clientId={clientId} />}
      {tab === 'progress' && <ProgressTab clientId={clientId} />}
    </div>
  )
}

// ---------- Akte: Notizen + zugewiesene Pläne ----------

function AkteTab({ clientId }) {
  const notesQuery = useClientNotes(clientId)
  const addNote = useAddClientNote(clientId)
  const deleteNote = useDeleteClientNote(clientId)
  const plansQuery = useClientPlans(clientId)
  const [text, setText] = useState('')
  const [showAssign, setShowAssign] = useState(false)

  const notes = notesQuery.data || []
  const plans = plansQuery.data || []
  const error = notesQuery.error?.message || addNote.error?.message

  function handleAdd(e) {
    e.preventDefault()
    if (!text.trim()) return
    addNote.mutate(text.trim())
    setText('')
  }

  function formatDateTime(iso) {
    return new Date(iso).toLocaleDateString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  if (notesQuery.isPending && !notesQuery.data) return <SkeletonPage title={false} count={3} />

  return (
    <div>
      {error && <div className="error-msg">{error}</div>}

      <section className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm text-muted font-bold">Zugewiesene Pläne</h2>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowAssign(true)}>+ Plan zuweisen</button>
        </div>
        {showAssign && <AssignPlanSheet clientId={clientId} onClose={() => setShowAssign(false)} />}
        {plans.length === 0 ? (
          <div className="card"><p className="text-sm text-muted">Noch kein Plan zugewiesen.</p></div>
        ) : (
          <div className={styles.planList}>
            {plans.map(p => (
              <div key={p.id} className={`card ${styles.planRow}`}>
                <div>
                  <div className="font-bold">{p.name}</div>
                  {p.description && <div className="text-xs text-muted">{p.description}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm text-muted font-bold mb-3">Notizen</h2>
        <form onSubmit={handleAdd} className="mb-3">
          <textarea
            className={styles.noteInput}
            placeholder="Notiz zur Akte hinzufügen — z.B. Befund, Ziel, Absprache..."
            value={text}
            onChange={e => setText(e.target.value)}
            rows={3}
          />
          <button type="submit" className="btn btn-primary btn-sm mt-2" disabled={!text.trim() || addNote.isPending}>
            {addNote.isPending ? '...' : '+ Notiz speichern'}
          </button>
        </form>

        {notes.length === 0 ? (
          <div className="card"><p className="text-sm text-muted">Noch keine Notizen in der Akte.</p></div>
        ) : (
          <div className={styles.noteList}>
            {notes.map(n => (
              <div key={n.id} className={`card ${styles.noteCard}`}>
                <div className={styles.noteHeader}>
                  <span className="text-xs text-muted">{formatDateTime(n.created_at)}</span>
                  <button className={styles.noteDelete} onClick={() => deleteNote.mutate(n.id)} title="Notiz löschen">✕</button>
                </div>
                <p className={styles.noteText}>{n.note}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// Template-Plan auswählen und dem Kunden als Kopie zuweisen
function AssignPlanSheet({ clientId, onClose }) {
  const templatesQuery = usePlans()
  const assignPlan = useAssignPlanToClient(clientId)
  const templates = (templatesQuery.data || []).filter(p => !p.client_id)

  function handleAssign(planId) {
    assignPlan.mutate(planId, { onSuccess: onClose })
  }

  return (
    <div className={`card ${styles.assignSheet}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold">Plan auswählen</h3>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
      </div>
      {assignPlan.error && <div className="error-msg">{assignPlan.error.message}</div>}
      {templates.length === 0 ? (
        <p className="text-sm text-muted">Keine Vorlagen vorhanden — lege zuerst unter „Pläne" einen Plan an.</p>
      ) : (
        <div className={styles.planList}>
          {templates.map(p => (
            <button
              key={p.id}
              className={`card ${styles.planRow} ${styles.planSelectable}`}
              onClick={() => handleAssign(p.id)}
              disabled={assignPlan.isPending}
            >
              <div>
                <div className="font-bold">{p.name}</div>
                {p.description && <div className="text-xs text-muted">{p.description}</div>}
              </div>
              <span className="text-accent">Zuweisen →</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- Training: letzte Sessions des Kunden (read-only) ----------

function TrainingTab({ clientId }) {
  const sessionsQuery = useClientSessions(clientId)
  const [expanded, setExpanded] = useState(null)
  const sessions = sessionsQuery.data || []

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  if (sessionsQuery.isPending && !sessionsQuery.data) return <SkeletonPage title={false} count={4} />

  if (sessions.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">📅</div>
        <h3>Noch kein Training</h3>
        <p>Dein Klient hat noch kein Training aufgezeichnet.</p>
      </div>
    )
  }

  return (
    <div className={styles.noteList}>
      {sessions.map(session => (
        <div key={session.id} className="card">
          <button
            className={styles.sessionRow}
            onClick={() => setExpanded(expanded === session.id ? null : session.id)}
          >
            <div>
              <div className="font-bold">{session.plan_name || 'Training'}</div>
              <div className="text-xs text-muted">{formatDate(session.date)}</div>
            </div>
            <span className="text-muted">{expanded === session.id ? '▲' : '▼'}</span>
          </button>
          {expanded === session.id && <ClientSessionSets session={session} />}
        </div>
      ))}
    </div>
  )
}

function ClientSessionSets({ session }) {
  const setsQuery = useSessionSets(session.id)
  const sets = setsQuery.data || []

  const grouped = {}
  sets.forEach(s => {
    if (!grouped[s.exercise_name]) grouped[s.exercise_name] = []
    grouped[s.exercise_name].push(s)
  })

  return (
    <div className={styles.sessionDetail}>
      {session.notes && <div className={styles.sessionNotes}>💬 {session.notes}</div>}
      {setsQuery.isPending ? (
        <div className="text-sm text-muted">Lade...</div>
      ) : sets.length === 0 ? (
        <div className="text-sm text-muted">Keine Sets aufgezeichnet.</div>
      ) : (
        Object.entries(grouped).map(([name, exSets]) => (
          <div key={name} className={styles.exGroup}>
            <div className="text-sm font-bold">{name}</div>
            {exSets.map((s, i) => (
              <div key={i} className="text-sm text-muted">
                Satz {s.set_number}: {s.weight} kg × {s.reps} Wdh
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  )
}

// ---------- Fortschritt des Kunden ----------

function ProgressTab({ clientId }) {
  const namesQuery = useClientExerciseNames(clientId)
  const [selected, setSelected] = useState(null)
  const progressQuery = useClientProgress(clientId, selected)

  const names = namesQuery.data || []
  const progress = progressQuery.data || []

  return (
    <div>
      <div className="form-group">
        <label className="label">Übung auswählen</label>
        <select value={selected || ''} onChange={e => setSelected(e.target.value || null)}>
          <option value="">– Übung wählen –</option>
          {names.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      {selected && (
        <div className="card mt-3">
          <h2 className="font-bold mb-2">{selected}</h2>
          <p className="text-xs text-muted mb-3">Maximales Gewicht pro Training</p>
          {progressQuery.isPending ? (
            <div className="spinner" />
          ) : progress.length < 2 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <p>Mindestens 2 Trainings mit dieser Übung nötig.</p>
            </div>
          ) : (
            <ProgressChart data={progress} />
          )}
        </div>
      )}

      {!selected && (
        <div className="empty-state">
          <div className="icon">📈</div>
          <h3>Übung auswählen</h3>
          <p>Wähle eine Übung, um den Fortschritt deines Klienten zu sehen.</p>
        </div>
      )}
    </div>
  )
}
