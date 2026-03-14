import { useState, useRef, useEffect } from 'react'
import { API_BASE } from '../config'
import './ChatPage.css'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [attachmentText, setAttachmentText] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAttachedFile(file)
    setAttachmentText(null)
    setUploadError(null)
    setIsUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${API_BASE}/api/chat/upload`, { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json()
        setUploadError(err.error ?? 'Upload failed')
        setAttachedFile(null)
        return
      }
      const data = await res.json()
      setAttachmentText(data.text as string)
    } catch {
      setUploadError('Upload failed')
      setAttachedFile(null)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function removeAttachment() {
    setAttachedFile(null)
    setAttachmentText(null)
    setUploadError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || isLoading) return

    const userMsg: ChatMessage = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    const currentAttachmentText = attachmentText
    setAttachedFile(null)
    setAttachmentText(null)

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: text }],
          systemPrompt: 'You are a helpful assistant.',
          attachmentText: currentAttachmentText ?? undefined,
        }),
      })

      if (!res.ok || !res.body) throw new Error(`Server error: ${res.status}`)

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

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
            setMessages(prev => {
              const copy = [...prev]
              const last = copy[copy.length - 1]
              if (last?.role === 'assistant') {
                copy[copy.length - 1] = { ...last, content: last.content + (event.content as string) }
              }
              return copy
            })
          } else if (event.type === 'error') {
            setMessages(prev => {
              const copy = [...prev]
              const last = copy[copy.length - 1]
              if (last?.role === 'assistant') {
                copy[copy.length - 1] = { ...last, content: `Error: ${event.message as string}` }
              }
              return copy
            })
          }
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="chat-page">
      <div className="chat-main">
        <div className="chat-header">
          <h1>💬 AI Chat</h1>
          <p>Powered by Azure AI Foundry</p>
        </div>
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-empty">Send a message to start chatting</div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`chat-bubble ${m.role}`}>
              <div className="chat-bubble-role">{m.role === 'user' ? 'You' : 'AI'}</div>
              <div className="chat-bubble-content">{m.content}</div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="chat-bubble assistant"><div className="chat-bubble-content">Thinking…</div></div>
          )}
          <div ref={messagesEndRef} />
        </div>
        {uploadError && (
          <div className="chat-attachment-bar chat-attachment-error">
            <span className="chat-attachment-badge">⚠ {uploadError}</span>
            <button className="chat-attachment-remove" onClick={removeAttachment} title="Dismiss">✕</button>
          </div>
        )}
        {attachedFile && !uploadError && (
          <div className="chat-attachment-bar">
            <span className="chat-attachment-badge">
              📎 {attachedFile.name}
              {isUploading ? ' (uploading…)' : attachmentText ? ' ✓' : ''}
            </span>
            <button className="chat-attachment-remove" onClick={removeAttachment} title="Remove attachment">✕</button>
          </div>
        )}
        <div className="chat-input-bar">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            className="chat-file-input"
            onChange={handleFileChange}
          />
          <button
            className="chat-attach-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isUploading}
            title="Attach PDF or Word document"
          >📎</button>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Type a message…"
            disabled={isLoading}
          />
          <button onClick={sendMessage} disabled={isLoading || isUploading || !input.trim()} aria-label={isUploading ? 'Uploading attachment…' : 'Send message'}>Send</button>
        </div>
      </div>
    </div>
  )
}
