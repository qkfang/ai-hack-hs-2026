import { useState, useEffect, useCallback } from 'react'
import { useUser } from '../contexts/UserContext'
import './GalleryPage.css'

interface ComicEntry {
  id: number
  description: string
  imageUrl: string
  createdAt: string
  userId: number
  username: string
}

export function GalleryPage() {
  const { user } = useUser()
  const [comics, setComics] = useState<ComicEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<ComicEntry | null>(null)

  const fetchComics = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/comics')
      if (!res.ok) throw new Error('Failed to fetch gallery')
      const data = await res.json() as ComicEntry[]
      setComics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load gallery')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchComics()
  }, [fetchComics])

  const othersComics = comics.filter(c => c.userId !== user?.id)
  const myComics = comics.filter(c => c.userId === user?.id)

  return (
    <div className="gallery-page">
      <div className="gallery-header">
        <div className="gallery-header-text">
          <h1>🌟 Community Gallery</h1>
          <p>Explore AI-generated comics from all users</p>
        </div>
        <button className="gallery-refresh-btn" onClick={fetchComics} disabled={loading}>
          {loading ? '⏳' : '🔄'} Refresh
        </button>
      </div>

      {error && <div className="gallery-error">{error}</div>}

      {loading && (
        <div className="gallery-loading">
          <div className="gallery-spinner" />
          <p>Loading gallery…</p>
        </div>
      )}

      {!loading && comics.length === 0 && (
        <div className="gallery-empty">
          <span className="gallery-empty-icon">🎨</span>
          <h2>No comics yet!</h2>
          <p>Be the first to create a comic in the Comic Studio.</p>
        </div>
      )}

      {!loading && othersComics.length > 0 && (
        <section className="gallery-section">
          <h2 className="gallery-section-title">👥 Others' Work</h2>
          <div className="gallery-grid">
            {othersComics.map(comic => (
              <div key={comic.id} className="gallery-card" onClick={() => setSelected(comic)}>
                <div className="gallery-card-img-wrapper">
                  <img src={comic.imageUrl} alt={comic.description} className="gallery-card-img" />
                  <div className="gallery-card-overlay">
                    <span>🔍 View</span>
                  </div>
                </div>
                <div className="gallery-card-body">
                  <div className="gallery-card-author">
                    <span className="gallery-author-avatar">{comic.username[0].toUpperCase()}</span>
                    <span className="gallery-author-name">{comic.username}</span>
                    <span className="gallery-author-id">#{comic.userId}</span>
                  </div>
                  <p className="gallery-card-desc">{comic.description}</p>
                  <span className="gallery-card-time">
                    {new Date(comic.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && myComics.length > 0 && (
        <section className="gallery-section">
          <h2 className="gallery-section-title">🎨 My Work</h2>
          <div className="gallery-grid">
            {myComics.map(comic => (
              <div key={comic.id} className="gallery-card gallery-card--mine" onClick={() => setSelected(comic)}>
                <div className="gallery-card-img-wrapper">
                  <img src={comic.imageUrl} alt={comic.description} className="gallery-card-img" />
                  <div className="gallery-card-overlay">
                    <span>🔍 View</span>
                  </div>
                </div>
                <div className="gallery-card-body">
                  <p className="gallery-card-desc">{comic.description}</p>
                  <span className="gallery-card-time">
                    {new Date(comic.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Lightbox */}
      {selected && (
        <div className="gallery-lightbox" onClick={() => setSelected(null)}>
          <div className="gallery-lightbox-content" onClick={e => e.stopPropagation()}>
            <button className="gallery-lightbox-close" onClick={() => setSelected(null)}>✕</button>
            <img src={selected.imageUrl} alt={selected.description} className="gallery-lightbox-img" />
            <div className="gallery-lightbox-info">
              <div className="gallery-lightbox-author">
                <span className="gallery-author-avatar">{selected.username[0].toUpperCase()}</span>
                <strong>{selected.username}</strong>
                <span className="gallery-author-id">#{selected.userId}</span>
              </div>
              <p className="gallery-lightbox-desc">{selected.description}</p>
              <span className="gallery-lightbox-time">{new Date(selected.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
