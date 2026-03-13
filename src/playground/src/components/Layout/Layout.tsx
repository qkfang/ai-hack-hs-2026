import { NavLink, Outlet } from 'react-router-dom'
import './Layout.css'

export function Layout() {
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-brand">
          <span className="brand-icon">🤖</span>
          <span className="brand-name">AI Playground</span>
        </div>
        <nav className="app-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Home
          </NavLink>
          <NavLink
            to="/agent"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Agent Builder
          </NavLink>
          <NavLink
            to="/chat"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Chat
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            About
          </NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <p>AI Playground — Powered by Azure AI Foundry</p>
      </footer>
    </div>
  )
}
