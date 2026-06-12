import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlans, useSavePlan, useDeletePlan } from '../hooks/queries.js'
import PlanForm from '../components/PlanForm.jsx'
import { SkeletonPage } from '../components/Skeleton.jsx'
import styles from './PlansPage.module.css'

export default function PlansPage() {
  const navigate = useNavigate()
  const plansQuery = usePlans()
  const savePlan = useSavePlan()
  const deletePlan = useDeletePlan()
  const [showForm, setShowForm] = useState(false)
  const [editPlan, setEditPlan] = useState(null)

  const plans = plansQuery.data || []
  const error = plansQuery.error?.message || savePlan.error?.message || deletePlan.error?.message

  async function handleSave(data) {
    setShowForm(false)
    setEditPlan(null)
    savePlan.mutate(data)
  }

  function handleDelete(plan) {
    if (!confirm(`Plan "${plan.name}" wirklich löschen?`)) return
    deletePlan.mutate(plan.id)
  }

  if (plansQuery.isPending && !plansQuery.data) return <SkeletonPage />

  return (
    <div className="page">
      <div className="page-title">
        Trainingspläne
        <button className="btn btn-primary btn-sm" onClick={() => { setEditPlan(null); setShowForm(true) }}>
          + Neu
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {(showForm || editPlan) && (
        <PlanForm
          plan={editPlan}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditPlan(null) }}
        />
      )}

      {plans.length === 0 && !showForm ? (
        <div className="empty-state">
          <div className="icon">📋</div>
          <h3>Noch kein Plan</h3>
          <p>Erstelle deinen ersten Trainingsplan und füge Übungen hinzu.</p>
          <button className="btn btn-primary mt-3" onClick={() => setShowForm(true)}>
            Ersten Plan erstellen
          </button>
        </div>
      ) : (
        <div className={styles.list}>
          {plans.map(plan => (
            <div key={plan.id} className={`card ${styles.planCard}`}>
              <div className={styles.planInfo} onClick={() => navigate(`/plans/${plan.id}`, { state: { plan } })}>
                <div className={styles.planName}>{plan.name}</div>
                {plan.description && <div className="text-sm text-muted">{plan.description}</div>}
              </div>
              <div className={styles.planActions}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => navigate(`/session/${plan.id}`, { state: { plan } })}
                >
                  ▶ Start
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigate(`/plans/${plan.id}`, { state: { plan } })}
                >
                  ✏️
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(plan)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
