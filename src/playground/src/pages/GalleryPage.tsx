import { useState, useEffect, useCallback } from 'react'
import { useUser } from '../contexts/UserContext'
import { API_BASE } from '../config'
import './GalleryPage.css'

interface ComicEntry {
  id: number
  description: string
  imageUrl: string
  createdAt: string
  userId: number
  username: string
}

interface StoryEntry {
  id: number
  title: string
  body: string
  coverImageUrl: string
  createdAt: string
  userId: number
  username: string
}

export function GalleryPage() {
  const { user } = useUser()
  const [comics, setComics] = useState<ComicEntry[]>([])
  const [stories, setStories] = useState<StoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<ComicEntry | null>(null)
  const [selectedStory, setSelectedStory] = useState<StoryEntry | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [comicsRes, storiesRes] = await Promise.all([
        fetch(`${API_BASE}/api/comics`),
        fetch(`${API_BASE}/api/stories`),
      ])
      if (!comicsRes.ok) throw new Error('Failed to fetch comics')
      if (!storiesRes.ok) throw new Error('Failed to fetch stories')
      setComics(await comicsRes.json() as ComicEntry[])
      setStories(await storiesRes.json() as StoryEntry[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load gallery')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const othersComics = comics.filter(c => c.userId !== user?.id)
  const myComics = comics.filter(c => c.userId === user?.id)
  const othersStories = stories.filter(s => s.userId !== user?.id)
  const myStories = stories.filter(s => s.userId === user?.id)

  return (
    <div className="gallery-page">
      <div className="gallery-header">
        <div className="gallery-header-text">
          <h1>🌟 Community Gallery</h1>
          <p>Explore AI-generated comics and stories from all users</p>
        </div>
        <button className="gallery-refresh-btn" onClick={fetchAll} disabled={loading}>
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

      {!loading && comics.length === 0 && stories.length === 0 && (
        <div className="gallery-empty">
          <span className="gallery-empty-icon">🎨</span>
          <h2>Nothing here yet!</h2>
          <p>Be the first to create a comic or story.</p>
        </div>
      )}

      {!loading && (othersComics.length > 0 || othersStories.length > 0) && (
        <section className="gallery-section">
          <h2 className="gallery-section-title">👥 Others' Work</h2>
          <div className="gallery-grid">
            {othersComics.map(comic => (
              <div key={`comic-${comic.id}`} className="gallery-card" onClick={() => setSelected(comic)}>
                <div className="gallery-card-img-wrapper">
                  <img src={comic.imageUrl} alt={comic.description} className="gallery-card-img" />
                  <div className="gallery-card-overlay"><span>🔍 View</span></div>
                </div>
                <div className="gallery-card-body">
                  <div className="gallery-card-author">
                    <span className="gallery-author-avatar">{(comic.username[0] ?? '?').toUpperCase()}</span>
                    <span className="gallery-author-name">{comic.username}</span>
                    <span className="gallery-author-id">#{comic.userId}</span>
                  </div>
                  <p className="gallery-card-desc">{comic.description}</p>
                  <span className="gallery-card-time">{new Date(comic.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
            {othersStories.map(story => (
              <div key={`story-${story.id}`} className="gallery-card gallery-card--story" onClick={() => setSelectedStory(story)}>
                <div className="gallery-story-cover">
                  {story.coverImageUrl ? (
                    <img src={story.coverImageUrl} alt={story.title} className="gallery-card-img" />
                  ) : (
                    <div className="gallery-story-cover-placeholder">📖</div>
                  )}
                  <div className="gallery-card-overlay"><span>📖 Read</span></div>
                </div>
                <div className="gallery-card-body">
                  <div className="gallery-card-author">
                    <span className="gallery-author-avatar">{(story.username[0] ?? '?').toUpperCase()}</span>
                    <span className="gallery-author-name">{story.username}</span>
                    <span className="gallery-author-id">#{story.userId}</span>
                  </div>
                  <p className="gallery-card-title">{story.title}</p>
                  <p className="gallery-card-desc">{story.body}</p>
                  <span className="gallery-card-time">{new Date(story.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && (myComics.length > 0 || myStories.length > 0) && (
        <section className="gallery-section">
          <h2 className="gallery-section-title">🎨 My Work</h2>
          <div className="gallery-grid">
            {myComics.map(comic => (
              <div key={`comic-${comic.id}`} className="gallery-card gallery-card--mine" onClick={() => setSelected(comic)}>
                <div className="gallery-card-img-wrapper">
                  <img src={comic.imageUrl} alt={comic.description} className="gallery-card-img" />
                  <div className="gallery-card-overlay"><span>🔍 View</span></div>
                </div>
                <div className="gallery-card-body">
                  <p className="gallery-card-desc">{comic.description}</p>
                  <span className="gallery-card-time">{new Date(comic.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
            {myStories.map(story => (
              <div key={`story-${story.id}`} className="gallery-card gallery-card--mine gallery-card--story" onClick={() => setSelectedStory(story)}>
                <div className="gallery-story-cover">
                  {story.coverImageUrl ? (
                    <img src={story.coverImageUrl} alt={story.title} className="gallery-card-img" />
                  ) : (
                    <div className="gallery-story-cover-placeholder">📖</div>
                  )}
                  <div className="gallery-card-overlay"><span>📖 Read</span></div>
                </div>
                <div className="gallery-card-body">
                  <p className="gallery-card-title">{story.title}</p>
                  <p className="gallery-card-desc">{story.body}</p>
                  <span className="gallery-card-time">{new Date(story.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Comic lightbox */}
      {selected && (
        <div className="gallery-lightbox" onClick={() => setSelected(null)}>
          <div className="gallery-lightbox-content" onClick={e => e.stopPropagation()}>
            <button className="gallery-lightbox-close" onClick={() => setSelected(null)}>✕</button>
            <img src={selected.imageUrl} alt={selected.description} className="gallery-lightbox-img" />
            <div className="gallery-lightbox-info">
              <div className="gallery-lightbox-author">
                <span className="gallery-author-avatar">{(selected.username[0] ?? '?').toUpperCase()}</span>
                <strong>{selected.username}</strong>
                <span className="gallery-author-id">#{selected.userId}</span>
              </div>
              <p className="gallery-lightbox-desc">{selected.description}</p>
              <span className="gallery-lightbox-time">{new Date(selected.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Story lightbox */}
      {selectedStory && (
        <div className="gallery-lightbox" onClick={() => setSelectedStory(null)}>
          <div className="gallery-lightbox-content gallery-story-modal" onClick={e => e.stopPropagation()}>
            <button className="gallery-lightbox-close" onClick={() => setSelectedStory(null)}>✕</button>
            {selectedStory.coverImageUrl && (
              <img src={selectedStory.coverImageUrl} alt={selectedStory.title} className="gallery-lightbox-img" />
            )}
            <div className="gallery-lightbox-info">
              <div className="gallery-lightbox-author">
                <span className="gallery-author-avatar">{(selectedStory.username[0] ?? '?').toUpperCase()}</span>
                <strong>{selectedStory.username}</strong>
                <span className="gallery-author-id">#{selectedStory.userId}</span>
              </div>
              <h3 className="gallery-story-modal-title">{selectedStory.title}</h3>
              <pre className="gallery-story-modal-body">{selectedStory.body}</pre>
              <span className="gallery-lightbox-time">{new Date(selectedStory.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
