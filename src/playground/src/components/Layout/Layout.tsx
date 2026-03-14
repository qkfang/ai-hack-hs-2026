import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom'
import { useUser } from '../../contexts/UserContext'
import './Layout.css'

export function Layout() {
  const { user, logout } = useUser()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <Link to="/" className="header-brand">
          <span className="brand-icon">🤖</span>
          <span className="brand-name">AI Playground</span>
        </Link>
        <nav className="app-nav">
          <NavLink
            to="/chat"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Chat
          </NavLink>
          <NavLink
            to="/agent"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Agent Builder
          </NavLink>
          <NavLink
            to="/comic"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            🎨 Comic Studio
          </NavLink>
          <NavLink
            to="/storybook"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            📖 Story Book
          </NavLink>
          <NavLink
            to="/gallery"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            🌟 Gallery
          </NavLink>
        </nav>
        {user && (
          <div className="header-user">
            <span className="user-avatar">{(user.username[0] ?? '?').toUpperCase()}</span>
            <span className="user-name">{user.username}</span>
            <span className="user-id">#{user.id}</span>
            <button className="logout-btn" onClick={handleLogout} title="Log out">
              ↩
            </button>
          </div>
        )}
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
