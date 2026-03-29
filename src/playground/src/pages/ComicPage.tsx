import { useState } from 'react'
import { useUser } from '../contexts/UserContext'
import { API_BASE } from '../config'
import { useRateLimit } from '../hooks/useRateLimit'
import './ComicPage.css'

interface ComicItem {
  id: number
  description: string
  imageUrl: string
  createdAt: string
}

const COVER_IMAGE_KEY = 'storybook_cover_url'

export function ComicPage() {
  const { user } = useUser()
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [comics, setComics] = useState<ComicItem[]>([])
  const [selectedImageUrl, setSelectedImageUrl] = useState('')
  const [editPrompt, setEditPrompt] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')
  const [coverSet, setCoverSet] = useState(false)
  const { isRateLimited, countdown, triggerRateLimit } = useRateLimit()

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const desc = description.trim()
    if (!desc) { setError('Please enter a description for your comic.'); return }
    setLoading(true)
    setSelectedImageUrl('')
    setCoverSet(false)
    try {
      const res = await fetch(`${API_BASE}/api/dalle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: desc, userId: user?.id }),
      })
      const data = await res.json() as { imageUrl?: string; error?: string; retryAfter?: number }
      if (res.status === 429) {
        triggerRateLimit(data.retryAfter ?? 15)
        setError(data.error ?? 'Rate limit reached, please wait.')
        return
      }
      if (!res.ok) throw new Error(data.error ?? 'Image generation failed')
      const imageUrl = data.imageUrl ?? ''
      setSelectedImageUrl(imageUrl)
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

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    setEditError('')
    const prompt = editPrompt.trim()
    if (!prompt || !selectedImageUrl) return
    setEditLoading(true)
    setCoverSet(false)
    try {
      const res = await fetch(`${API_BASE}/api/dalle/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: selectedImageUrl, prompt }),
      })
      const data = await res.json() as { imageUrl?: string; error?: string; retryAfter?: number }
      if (res.status === 429) {
        triggerRateLimit(data.retryAfter ?? 15)
        setEditError(data.error ?? 'Rate limit reached, please wait.')
        return
      }
      if (!res.ok) throw new Error(data.error ?? 'Image edit failed')
      const newUrl = data.imageUrl ?? ''
      setSelectedImageUrl(newUrl)
      const newComic: ComicItem = {
        id: Date.now(),
        description: `Edit: ${prompt}`,
        imageUrl: newUrl,
        createdAt: new Date().toISOString(),
      }
      setComics(prev => [newComic, ...prev])
      setEditPrompt('')
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setEditLoading(false)
    }
  }

  function handleSetCover() {
    if (!selectedImageUrl) return
    localStorage.setItem(COVER_IMAGE_KEY, selectedImageUrl)
    setCoverSet(true)
  }

  function handleSelectComic(imageUrl: string) {
    setSelectedImageUrl(imageUrl)
    setEditPrompt('')
    setEditError('')
    setCoverSet(false)
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
            {isRateLimited && (
              <div className="comic-rate-limit">⏳ Please wait <strong>{countdown}s</strong> before trying again.</div>
            )}
            <button
              type="submit"
              className="comic-generate-btn"
              disabled={loading || isRateLimited || !description.trim()}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Generating your comic…
                </>
              ) : isRateLimited ? `Wait ${countdown}s` : (
                '✨ Generate Comic'
              )}
            </button>
          </form>

          {loading && (
            <div className="comic-loading-msg">
              🖌️ DALL-E is painting your scene… this may take a moment
            </div>
          )}

          {selectedImageUrl && (
            <div className="comic-edit-panel">
              <h3>✏️ Edit Selected Image</h3>
              <form onSubmit={handleEdit} className="comic-edit-form">
                <textarea
                  className="comic-textarea"
                  placeholder="Describe what to change, e.g. 'Make the sky purple and add shooting stars'…"
                  value={editPrompt}
                  onChange={e => setEditPrompt(e.target.value)}
                  rows={3}
                  maxLength={500}
                  disabled={editLoading}
                />
                {editError && <div className="comic-error">{editError}</div>}
                <button
                  type="submit"
                  className="comic-edit-btn"
                  disabled={editLoading || isRateLimited || !editPrompt.trim()}
                >
                  {editLoading ? (
                    <><span className="spinner" />Applying changes…</>
                  ) : isRateLimited ? `Wait ${countdown}s` : '🔄 Apply Changes'}
                </button>
              </form>
              <button
                className={`comic-cover-btn${coverSet ? ' cover-set' : ''}`}
                onClick={handleSetCover}
              >
                {coverSet ? '✅ Set as Story Book Cover!' : '📚 Use as Story Book Cover'}
              </button>
            </div>
          )}
        </div>

        <div className="comic-preview-panel">
          {selectedImageUrl ? (
            <div className="comic-latest">
              <h2>🖼️ Selected Image</h2>
              <div className="comic-image-frame selected">
                <img src={selectedImageUrl} alt="Selected comic" className="comic-image" />
              </div>
              <a href={selectedImageUrl} target="_blank" rel="noopener noreferrer" className="comic-download-link">
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
              <div
                key={comic.id}
                className={`comic-card${comic.imageUrl === selectedImageUrl ? ' selected' : ''}`}
                onClick={() => handleSelectComic(comic.imageUrl)}
              >
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
