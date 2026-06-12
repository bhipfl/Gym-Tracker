import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Plus, Check, Link2, Trash2 } from 'lucide-react'
import { useClients, useOpenInvitations, useCreateInvitation, useDeleteInvitation } from '../../hooks/queries.js'
import { SkeletonPage } from '../../components/Skeleton.jsx'
import styles from './CoachDashboard.module.css'

export default function CoachDashboard() {
  const navigate = useNavigate()
  const clientsQuery = useClients()
  const invitationsQuery = useOpenInvitations()
  const createInvitation = useCreateInvitation()
  const deleteInvitation = useDeleteInvitation()
  const [copied, setCopied] = useState(null)

  const clients = clientsQuery.data || []
  const invitations = invitationsQuery.data || []
  const error = clientsQuery.error?.message || createInvitation.error?.message

  function inviteLink(code) {
    const base = window.location.href.split('#')[0]
    return `${base}#/invite/${code}`
  }

  async function handleCopy(code) {
    try {
      await navigator.clipboard.writeText(inviteLink(code))
      setCopied(code)
      setTimeout(() => setCopied(null), 2500)
    } catch {
      prompt('Link kopieren:', inviteLink(code))
    }
  }

  function formatDate(iso) {
    if (!iso) return '–'
    return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  if (clientsQuery.isPending && !clientsQuery.data) return <SkeletonPage />

  return (
    <div className="page">
      <div className="page-title">
        Meine Klienten
        <button
          className="btn btn-primary btn-sm"
          onClick={() => createInvitation.mutate(null)}
          disabled={createInvitation.isPending}
        >
          {createInvitation.isPending ? '...' : <><Plus size={16} /> Einladen</>}
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {invitations.length > 0 && (
        <section className="mb-4">
          <h2 className="text-sm text-muted font-bold mb-3">Offene Einladungen</h2>
          <div className={styles.list}>
            {invitations.map(inv => (
              <div key={inv.id} className={`card ${styles.inviteCard}`}>
                <div className={styles.inviteInfo}>
                  <code className={styles.inviteCode}>{inv.code}</code>
                  <span className="text-xs text-muted">gültig bis {formatDate(inv.expires_at)}</span>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-secondary btn-sm" onClick={() => handleCopy(inv.code)}>
                    {copied === inv.code ? <><Check size={14} /> Kopiert</> : <><Link2 size={14} /> Link</>}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => deleteInvitation.mutate(inv.id)} aria-label="Einladung löschen"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {clients.length === 0 ? (
        <div className="empty-state">
          <div className="icon"><Users size={48} strokeWidth={1.5} /></div>
          <h3>Noch keine Klienten</h3>
          <p>Erstelle eine Einladung und schicke den Link an deinen Klienten.</p>
          <button
            className="btn btn-primary mt-3"
            onClick={() => createInvitation.mutate(null)}
            disabled={createInvitation.isPending}
          >
            Ersten Klienten einladen
          </button>
        </div>
      ) : (
        <div className={styles.list}>
          {clients.map(client => (
            <button
              key={client.id}
              className={`card ${styles.clientCard}`}
              onClick={() => navigate(`/coach/clients/${client.id}`, { state: { client } })}
            >
              <div className={styles.avatar}>{(client.name || '?')[0].toUpperCase()}</div>
              <div className={styles.clientInfo}>
                <div className={styles.clientName}>{client.name}</div>
                <div className="text-xs text-muted">
                  Letztes Training: {formatDate(client.lastSession)}
                </div>
              </div>
              <div className={styles.weekBadge}>
                <span className={styles.weekCount}>{client.sessionsThisWeek}</span>
                <span className="text-xs text-muted">diese Woche</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
