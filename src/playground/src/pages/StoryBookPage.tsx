import { useState, useRef, useEffect } from 'react'
import { useUser } from '../contexts/UserContext'
import { API_BASE } from '../config'
import './StoryBookPage.css'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function StoryBookPage() {
  const { user } = useUser()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit')
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState('')
  const [publishSuccess, setPublishSuccess] = useState(false)

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  async function sendChatMessage() {
    const text = chatInput.trim()
    if (!text || chatLoading) return

    const userMsg: ChatMessage = { role: 'user', content: text }
    setChatMessages(prev => [...prev, userMsg])
    setChatInput('')
    setChatLoading(true)

    const systemPrompt = `You are a creative writing assistant helping the user write and improve their story.
The current story is:
Title: ${title || '(untitled)'}

${body || '(empty)'}

When the user asks for changes or suggestions, provide the updated story text or specific edits clearly.`

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatMessages, userMsg],
          systemPrompt,
        }),
      })

      if (!res.ok || !res.body) throw new Error(`Server error: ${res.status}`)

      setChatMessages(prev => [...prev, { role: 'assistant', content: '' }])

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue
          let event: Record<string, unknown>
          try { event = JSON.parse(raw) } catch { continue }

          if (event.type === 'content') {
            setChatMessages(prev => {
              const copy = [...prev]
              const last = copy[copy.length - 1]
              if (last?.role === 'assistant') {
                copy[copy.length - 1] = { ...last, content: last.content + (event.content as string) }
              }
              return copy
            })
          }
        }
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` }])
    } finally {
      setChatLoading(false)
    }
  }

  async function handlePublish() {
    if (!user) return
    const t = title.trim()
    const b = body.trim()
    if (!t || !b) { setPublishError('Please add a title and story body before publishing.'); return }

    setPublishing(true)
    setPublishError('')
    setPublishSuccess(false)
    try {
      const res = await fetch(`${API_BASE}/api/users/${user.id}/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: t, body: b, coverImageUrl: '' }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error ?? 'Publish failed')
      }
      setPublishSuccess(true)
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="storybook-page">
      <div className="storybook-editor-panel">
        <div className="storybook-editor-header">
          <h1>📖 Story Book</h1>
          {user && <span className="storybook-user">Writing as <strong>{user.username}</strong></span>}
        </div>

        <input
          className="storybook-title-input"
          placeholder="Story title…"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={200}
        />

        <div className="storybook-view-toggle">
          <button
            className={viewMode === 'edit' ? 'toggle-btn active' : 'toggle-btn'}
            onClick={() => setViewMode('edit')}
          >
            ✏️ Edit
          </button>
          <button
            className={viewMode === 'preview' ? 'toggle-btn active' : 'toggle-btn'}
            onClick={() => setViewMode('preview')}
          >
            👁️ Preview
          </button>
        </div>

        {viewMode === 'edit' ? (
          <textarea
            className="storybook-body-textarea"
            placeholder="Write your story here… (Markdown supported)"
            value={body}
            onChange={e => setBody(e.target.value)}
          />
        ) : (
          <div className="storybook-preview">
            {body ? (
              <pre className="storybook-preview-text">{body}</pre>
            ) : (
              <p className="storybook-preview-empty">Nothing to preview yet.</p>
            )}
          </div>
        )}

        <div className="storybook-publish-row">
          {publishError && <span className="storybook-publish-error">{publishError}</span>}
          {publishSuccess && <span className="storybook-publish-success">✅ Published to Gallery!</span>}
          <button
            className="storybook-publish-btn"
            onClick={handlePublish}
            disabled={publishing || !title.trim() || !body.trim()}
          >
            {publishing ? '⏳ Publishing…' : '🌟 Publish to Gallery'}
          </button>
        </div>
      </div>

      <div className="storybook-chat-panel">
        <div className="storybook-chat-header">
          <h2>✨ AI Writing Assistant</h2>
          <p>Ask the AI to help improve your story</p>
        </div>

        <div className="storybook-chat-messages">
          {chatMessages.length === 0 && (
            <div className="storybook-chat-empty">
              Ask me to rewrite a section, suggest plot ideas, improve pacing, or anything else!
            </div>
          )}
          {chatMessages.map((m, i) => (
            <div key={i} className={`storybook-bubble ${m.role}`}>
              <div className="storybook-bubble-role">{m.role === 'user' ? 'You' : 'AI'}</div>
              <div className="storybook-bubble-content">{m.content}</div>
            </div>
          ))}
          {chatLoading && chatMessages[chatMessages.length - 1]?.role !== 'assistant' && (
            <div className="storybook-bubble assistant">
              <div className="storybook-bubble-content">Thinking…</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="storybook-chat-input">
          <input
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
            placeholder="Ask for writing help…"
            disabled={chatLoading}
          />
          <button onClick={sendChatMessage} disabled={chatLoading || !chatInput.trim()}>Send</button>
        </div>
      </div>
    </div>
  )
}
