import { useState } from 'react'
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom'
import { useUser } from '../../contexts/UserContext'
import './Layout.css'

export function Layout() {
  const { user, logout } = useUser()
  const navigate = useNavigate()
  const [isMaxLayout, setIsMaxLayout] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className={`app-container${isMaxLayout ? ' max-layout' : ''}`}>
      {!isMaxLayout && (
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
            <NavLink
              to="/translation"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              🌐 Translation
            </NavLink>
            <NavLink
              to="/speech"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              🎙️ Speech
            </NavLink>
            <NavLink
              to="/realtime"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              ⚡ Realtime
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
      )}
      <main className="app-main">
        <button
          className="max-layout-btn"
          onClick={() => setIsMaxLayout(!isMaxLayout)}
          title={isMaxLayout ? 'Restore layout' : 'Maximize layout'}
          aria-label={isMaxLayout ? 'Restore layout' : 'Maximize layout'}
        >
          {isMaxLayout ? '⊡' : '⛶'}
        </button>
        <Outlet />
      </main>
      {!isMaxLayout && (
        <footer className="app-footer">
          <p>AI Playground — Powered by Azure AI Foundry</p>
        </footer>
      )}
    </div>
  )
}
