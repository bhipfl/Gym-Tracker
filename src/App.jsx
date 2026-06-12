import { lazy, Suspense, useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import SessionPage from './pages/SessionPage.jsx'
import InstallPrompt from './components/InstallPrompt.jsx'
import { SkeletonPage } from './components/Skeleton.jsx'
import { getConfig } from './services/storage.js'

// Hot Paths (Dashboard, Session) bleiben im Entry-Chunk, der Rest wird lazy geladen.
const PlansPage = lazy(() => import('./pages/PlansPage.jsx'))
const PlanDetailPage = lazy(() => import('./pages/PlanDetailPage.jsx'))
const HistoryPage = lazy(() => import('./pages/HistoryPage.jsx'))
const ProgressPage = lazy(() => import('./pages/ProgressPage.jsx'))
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'))

function RequireConfig({ children }) {
  const [ready, setReady] = useState(null)
  useEffect(() => { setReady(!!getConfig()?.url) }, [])
  if (ready === null) return null
  if (!ready) return <Navigate to="/settings" replace />
  return children
}

export default function App() {
  return (
    <HashRouter>
      <InstallPrompt />
      <Suspense fallback={<SkeletonPage />}>
        <Routes>
          <Route path="/settings" element={<SettingsPage />} />
          {/* Session routes are OUTSIDE Layout so the nav bar is hidden during training */}
          <Route path="/session/:planId" element={<RequireConfig><SessionPage /></RequireConfig>} />
          <Route path="/edit-session/:sessionId" element={<RequireConfig><SessionPage /></RequireConfig>} />
          <Route element={<Layout />}>
            <Route path="/" element={<RequireConfig><Dashboard /></RequireConfig>} />
            <Route path="/plans" element={<RequireConfig><PlansPage /></RequireConfig>} />
            <Route path="/plans/:id" element={<RequireConfig><PlanDetailPage /></RequireConfig>} />
            <Route path="/history" element={<RequireConfig><HistoryPage /></RequireConfig>} />
            <Route path="/progress" element={<RequireConfig><ProgressPage /></RequireConfig>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
