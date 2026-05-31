import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import PlansPage from './pages/PlansPage.jsx'
import PlanDetailPage from './pages/PlanDetailPage.jsx'
import SessionPage from './pages/SessionPage.jsx'
import HistoryPage from './pages/HistoryPage.jsx'
import ProgressPage from './pages/ProgressPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import InstallPrompt from './components/InstallPrompt.jsx'
import { getConfig } from './services/storage.js'
import { useEffect, useState } from 'react'

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
      <Routes>
        <Route path="/settings" element={<SettingsPage />} />
        <Route element={<Layout />}>
          <Route path="/" element={<RequireConfig><Dashboard /></RequireConfig>} />
          <Route path="/plans" element={<RequireConfig><PlansPage /></RequireConfig>} />
          <Route path="/plans/:id" element={<RequireConfig><PlanDetailPage /></RequireConfig>} />
          <Route path="/session/:planId" element={<RequireConfig><SessionPage /></RequireConfig>} />
          <Route path="/history" element={<RequireConfig><HistoryPage /></RequireConfig>} />
          <Route path="/progress" element={<RequireConfig><ProgressPage /></RequireConfig>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}
