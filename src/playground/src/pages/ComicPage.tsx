import { useState } from 'react'
import { useUser } from '../contexts/UserContext'
import './ComicPage.css'

interface ComicItem {
  id: number
  description: string
  imageUrl: string
  createdAt: string
}

export function ComicPage() {
  const { user } = useUser()
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [comics, setComics] = useState<ComicItem[]>([])
  const [latestImageUrl, setLatestImageUrl] = useState('')

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const desc = description.trim()
    if (!desc) { setError('Please enter a description for your comic.'); return }
    setLoading(true)
    setLatestImageUrl('')
    try {
      const res = await fetch('/api/dalle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: desc, userId: user?.id }),
      })
      const data = await res.json() as { imageUrl?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Image generation failed')
      const imageUrl = data.imageUrl ?? ''
      setLatestImageUrl(imageUrl)
      const newComic: ComicItem = {
        id: Date.now(),
        description: desc,
        imageUrl,
        createdAt: new Date().toISOString(),
      }
      setComics(prev => [newComic, ...prev])
      setDescription('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const placeholders = [
    'A brave astronaut exploring a neon-lit alien jungle…',
    'A dragon learning to code in a futuristic library…',
    'Two robots having a tea party on the moon…',
    'A superhero cat saving the city from yarn monsters…',
  ]
  const placeholder = placeholders[Math.floor(Date.now() / 10000) % placeholders.length]

  return (
    <div className="comic-page">
      <div className="comic-header">
        <h1>🎨 Comic Book Studio</h1>
        <p>Describe your scene and DALL-E will bring it to life!</p>
        {user && <p className="comic-user">Creating as <strong>{user.username}</strong> (ID: {user.id})</p>}
      </div>

      <div className="comic-layout">
        <div className="comic-form-panel">
          <form onSubmit={handleGenerate} className="comic-form">
            <label htmlFor="comic-desc" className="comic-label">
              📝 Describe your comic scene
            </label>
            <textarea
              id="comic-desc"
              className="comic-textarea"
              placeholder={placeholder}
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={5}
              maxLength={1000}
            />
            <div className="comic-char-count">{description.length} / 1000</div>
            {error && <div className="comic-error">{error}</div>}
            <button
              type="submit"
              className="comic-generate-btn"
              disabled={loading || !description.trim()}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Generating your comic…
                </>
              ) : (
                '✨ Generate Comic'
              )}
            </button>
          </form>

          {loading && (
            <div className="comic-loading-msg">
              🖌️ DALL-E is painting your scene… this may take a moment
            </div>
          )}
        </div>

        <div className="comic-preview-panel">
          {latestImageUrl ? (
            <div className="comic-latest">
              <h2>🖼️ Latest Creation</h2>
              <div className="comic-image-frame">
                <img src={latestImageUrl} alt="Generated comic" className="comic-image" />
              </div>
              <a href={latestImageUrl} target="_blank" rel="noopener noreferrer" className="comic-download-link">
                Open full size ↗
              </a>
            </div>
          ) : (
            <div className="comic-empty-preview">
              <span className="comic-empty-icon">🎭</span>
              <p>Your generated comic will appear here</p>
            </div>
          )}
        </div>
      </div>

      {comics.length > 0 && (
        <div className="comic-history">
          <h2>📚 Your Comics This Session</h2>
          <div className="comic-grid">
            {comics.map(comic => (
              <div key={comic.id} className="comic-card">
                <img src={comic.imageUrl} alt={comic.description} className="comic-card-img" />
                <div className="comic-card-body">
                  <p className="comic-card-desc">{comic.description}</p>
                  <span className="comic-card-time">
                    {new Date(comic.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
