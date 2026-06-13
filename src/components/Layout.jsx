import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Home, ClipboardList, History, TrendingUp, Settings, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import styles from './Layout.module.css'

const clientNav = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/plans', label: 'Pläne', icon: ClipboardList },
  { to: '/history', label: 'Verlauf', icon: History },
  { to: '/progress', label: 'Fortschritt', icon: TrendingUp },
  { to: '/settings', label: 'Profil', icon: Settings },
]

// Coach-Nav ist trainings-first (wie beim Klienten) + Klienten-Zugang.
// Profil/Settings ist über das Zahnrad im Dashboard-Header erreichbar.
const coachNav = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/plans', label: 'Pläne', icon: ClipboardList },
  { to: '/history', label: 'Verlauf', icon: History },
  { to: '/progress', label: 'Fortschritt', icon: TrendingUp },
  { to: '/coach', label: 'Klienten', icon: Users },
]

export default function Layout() {
  const location = useLocation()
  const { role } = useAuth()
  const nav = role === 'coach' ? coachNav : clientNav

  return (
    <div className={styles.layout}>
      <main key={location.pathname} className={`${styles.main} page-transition`}>
        <Outlet />
      </main>
      <nav className={styles.nav}>
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/' || to === '/coach'}
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
          >
            <span className={styles.navIcon}><Icon size={22} strokeWidth={2} /></span>
            <span className={styles.navLabel}>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
