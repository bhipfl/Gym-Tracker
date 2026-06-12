import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import SessionPage from './pages/SessionPage.jsx'
import InstallPrompt from './components/InstallPrompt.jsx'
import { SkeletonPage } from './components/Skeleton.jsx'
import { useAuth } from './context/AuthContext.jsx'

// Hot Paths (Dashboard, Session) bleiben im Entry-Chunk, der Rest wird lazy geladen.
const PlansPage = lazy(() => import('./pages/PlansPage.jsx'))
const PlanDetailPage = lazy(() => import('./pages/PlanDetailPage.jsx'))
const HistoryPage = lazy(() => import('./pages/HistoryPage.jsx'))
const ProgressPage = lazy(() => import('./pages/ProgressPage.jsx'))
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage.jsx'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage.jsx'))
const InvitePage = lazy(() => import('./pages/auth/InvitePage.jsx'))
const CoachDashboard = lazy(() => import('./pages/coach/CoachDashboard.jsx'))
const ClientDetailPage = lazy(() => import('./pages/coach/ClientDetailPage.jsx'))

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}

// Startseite je nach Rolle: Coach → Klientenübersicht, Klient → Dashboard
function Home() {
  const { role } = useAuth()
  if (role === 'coach') return <Navigate to="/coach" replace />
  return <Dashboard />
}

export default function App() {
  return (
    <HashRouter>
      <InstallPrompt />
      <Suspense fallback={<SkeletonPage />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/invite/:code" element={<InvitePage />} />

          {/* Session routes are OUTSIDE Layout so the nav bar is hidden during training */}
          <Route path="/session/:planId" element={<RequireAuth><SessionPage /></RequireAuth>} />
          <Route path="/edit-session/:sessionId" element={<RequireAuth><SessionPage /></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />

          <Route element={<Layout />}>
            <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
            <Route path="/coach" element={<RequireAuth><CoachDashboard /></RequireAuth>} />
            <Route path="/coach/clients/:id" element={<RequireAuth><ClientDetailPage /></RequireAuth>} />
            <Route path="/plans" element={<RequireAuth><PlansPage /></RequireAuth>} />
            <Route path="/plans/:id" element={<RequireAuth><PlanDetailPage /></RequireAuth>} />
            <Route path="/history" element={<RequireAuth><HistoryPage /></RequireAuth>} />
            <Route path="/progress" element={<RequireAuth><ProgressPage /></RequireAuth>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
