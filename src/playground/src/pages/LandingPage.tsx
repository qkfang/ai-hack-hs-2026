import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../contexts/UserContext'
import './LandingPage.css'

type Mode = 'choose' | 'create' | 'continue'

export function LandingPage() {
  const { setUser } = useUser()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('choose')
  const [username, setUsername] = useState('')
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const name = username.trim()
    if (!name) { setError('Please enter a username.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(data.error ?? 'Failed to create user')
      }
      const data = await res.json() as { id: number; username: string }
      setUser({ id: data.id, username: data.username })
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const id = parseInt(userId.trim(), 10)
    if (isNaN(id) || id < 1) { setError('Please enter a valid user ID.'); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${id}`)
      if (res.status === 404) throw new Error(`No user found with ID ${id}`)
      if (!res.ok) throw new Error('Failed to fetch user')
      const data = await res.json() as { id: number; username: string }
      setUser({ id: data.id, username: data.username })
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="landing-page">
      <div className="landing-card">
        <div className="landing-logo">🎨</div>
        <h1 className="landing-title">AI Playground</h1>
        <p className="landing-subtitle">Create AI-powered comic art and explore others' creations</p>

        {mode === 'choose' && (
          <div className="landing-choices">
            <button className="choice-btn choice-btn--primary" onClick={() => setMode('create')}>
              <span className="choice-icon">✨</span>
              <span className="choice-label">New User</span>
              <span className="choice-desc">Create a new account</span>
            </button>
            <button className="choice-btn choice-btn--secondary" onClick={() => setMode('continue')}>
              <span className="choice-icon">🔑</span>
              <span className="choice-label">Continue</span>
              <span className="choice-desc">Return with your User ID</span>
            </button>
          </div>
        )}

        {mode === 'create' && (
          <form className="landing-form" onSubmit={handleCreate}>
            <h2 className="form-title">Create Your Account</h2>
            <label className="form-label" htmlFor="username">Choose a username</label>
            <input
              id="username"
              className="form-input"
              type="text"
              placeholder="e.g. artlover42"
              value={username}
              onChange={e => setUsername(e.target.value)}
              maxLength={30}
              autoFocus
            />
            {error && <p className="form-error">{error}</p>}
            <button className="form-submit" type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Create Account →'}
            </button>
            <button className="form-back" type="button" onClick={() => { setMode('choose'); setError('') }}>
              ← Back
            </button>
          </form>
        )}

        {mode === 'continue' && (
          <form className="landing-form" onSubmit={handleContinue}>
            <h2 className="form-title">Welcome Back!</h2>
            <label className="form-label" htmlFor="userid">Enter your User ID</label>
            <input
              id="userid"
              className="form-input"
              type="number"
              placeholder="e.g. 42"
              min={1}
              value={userId}
              onChange={e => setUserId(e.target.value)}
              autoFocus
            />
            {error && <p className="form-error">{error}</p>}
            <button className="form-submit" type="submit" disabled={loading}>
              {loading ? 'Loading…' : 'Continue →'}
            </button>
            <button className="form-back" type="button" onClick={() => { setMode('choose'); setError('') }}>
              ← Back
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
