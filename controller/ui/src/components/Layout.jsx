import { NavLink, Outlet } from 'react-router-dom'
import ConnectionBadge from './ConnectionBadge'

const NAV = [
  { to: '/',           label: 'Robots',    end: true  },
  { to: '/dashboard',  label: 'Dashboard', end: false },
  { to: '/build',      label: 'Build',     end: false },
  { to: '/configure',  label: 'Configure', end: false },
  { to: '/control',    label: 'Control',   end: false },
  { to: '/assets',     label: 'Assets',    end: false },
]

export default function Layout() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="logo">Axon</span>
        </div>
        <nav>
          {NAV.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <ConnectionBadge />
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
