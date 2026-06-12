import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import styles from './Layout.module.css'

const clientNav = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/plans', label: 'Pläne', icon: '📋' },
  { to: '/history', label: 'Verlauf', icon: '📅' },
  { to: '/progress', label: 'Fortschritt', icon: '📈' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

const coachNav = [
  { to: '/coach', label: 'Klienten', icon: '🤝' },
  { to: '/plans', label: 'Pläne', icon: '📋' },
  { to: '/history', label: 'Verlauf', icon: '📅' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
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
        {nav.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/' || to === '/coach'}
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
          >
            <span className={styles.navIcon}>{icon}</span>
            <span className={styles.navLabel}>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
