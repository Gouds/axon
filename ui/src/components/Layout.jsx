import { NavLink, Outlet } from 'react-router-dom'
import ConnectionBadge from './ConnectionBadge'
import ThemePicker from './ThemePicker'
import SystemVolume from './SystemVolume'

const NAV = [
  { to: '/',         label: 'Dashboard', end: true  },
  { to: '/build',    label: 'Build',     end: false },
  { to: '/control',  label: 'Control',   end: false },
  { to: '/assets',   label: 'Assets',    end: false },
  { to: '/scripts',  label: 'Scripts',   end: false },
  { to: '/profiles', label: 'Profiles',  end: false },
  { to: '/sandbox',  label: 'Sandbox',   end: false },
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
          <SystemVolume />
          <ConnectionBadge />
          <ThemePicker />
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
