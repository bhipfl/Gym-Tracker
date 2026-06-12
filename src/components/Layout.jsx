import { Outlet, NavLink, useLocation } from 'react-router-dom'
import styles from './Layout.module.css'

const nav = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/plans', label: 'Pläne', icon: '📋' },
  { to: '/history', label: 'Verlauf', icon: '📅' },
  { to: '/progress', label: 'Fortschritt', icon: '📈' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

export default function Layout() {
  const location = useLocation()
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
            end={to === '/'}
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
