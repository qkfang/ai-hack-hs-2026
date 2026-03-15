import { useState, useRef, useEffect } from 'react'
import { API_BASE } from '../config'
import './ChatPage.css'

const GUIDE_SECTIONS = [
  {
    emoji: '🎯',
    title: 'Be Specific & Clear',
    tip: 'Vague prompts get vague answers. Tell the AI exactly what you want.',
    bad: 'Tell me about space.',
    good: 'Explain how black holes are formed in simple terms for a 12-year-old.',
  },
  {
    emoji: '🎭',
    title: 'Give the AI a Role',
    tip: 'Ask the AI to act as an expert to get better, more focused answers.',
    bad: 'Help me with my essay.',
    good: 'You are an English teacher. Review my essay and suggest improvements for clarity and structure.',
  },
  {
    emoji: '📋',
    title: 'Specify the Format',
    tip: 'Tell the AI how you want the answer: a list, a table, steps, a paragraph, etc.',
    bad: 'Give me study tips.',
    good: 'Give me 5 study tips as a numbered list, each with one sentence explanation.',
  },
  {
    emoji: '📝',
    title: 'Provide Context',
    tip: 'Give background information so the AI understands your situation.',
    bad: 'How do I fix this?',
    good: 'I am building a website with HTML and CSS. My button is not centered on the page. How do I fix this?',
  },
  {
    emoji: '💡',
    title: 'Show an Example (Few-Shot)',
    tip: 'Give the AI one or two examples of the output you want — it will follow the pattern.',
    bad: 'Write a tweet about my project.',
    good: 'Write a tweet about my project. Example style: "Just launched my first app 🚀 It detects cat vs dog in photos using AI. Try it at [link] #AI #teens"',
  },
  {
    emoji: '🔗',
    title: 'Ask It to Think Step by Step',
    tip: 'For maths, logic, or complex problems, ask the AI to reason through each step.',
    bad: 'What is 15% of 240?',
    good: 'What is 15% of 240? Think step by step.',
  },
  {
    emoji: '🔄',
    title: 'Iterate & Refine',
    tip: 'Your first prompt doesn\'t have to be perfect. Use follow-up messages to improve the answer.',
    followUps: [
      '"Make it shorter."',
      '"Explain that part again more simply."',
      '"Add an example for point 3."',
      '"Rewrite it in a friendlier tone."',
    ],
  },
  {
    emoji: '⛓️',
    title: 'Chain Your Prompts',
    tip: 'Break big tasks into small steps. Use the output from one prompt as input to the next.',
    steps: [
      'Step 1: "List 5 ideas for a sci-fi short story."',
      'Step 2: "Pick idea #3 and write an outline."',
      'Step 3: "Write the opening paragraph."',
    ],
  },
]

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
  const [guideOpen, setGuideOpen] = useState(false)
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
          <button
            className={`chat-guide-btn${guideOpen ? ' active' : ''}`}
            onClick={() => setGuideOpen(o => !o)}
            title="Prompt Engineering Guide"
          >
            📖 Prompt Guide
          </button>
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
      <div className={`chat-guide-panel${guideOpen ? ' open' : ''}`}>
        <div className="guide-panel-header">
          <span>📖 Prompt Engineering Guide</span>
          <button className="guide-close-btn" onClick={() => setGuideOpen(false)} title="Close guide">✕</button>
        </div>
        <div className="guide-panel-body">
          <p className="guide-intro">
            A <strong>prompt</strong> is what you type to the AI. Writing good prompts gets you much better answers.
            Here are the key techniques — takes about <strong>10 minutes</strong> to read! 🚀
          </p>
          {GUIDE_SECTIONS.map((s, i) => (
            <div key={i} className="guide-section">
              <h3>{s.emoji} {s.title}</h3>
              <p className="guide-tip">{s.tip}</p>
              {s.bad && (
                <div className="guide-examples">
                  <div className="guide-example bad">
                    <span className="guide-label bad">❌ Weak</span>
                    <code>{s.bad}</code>
                  </div>
                  <div className="guide-example good">
                    <span className="guide-label good">✅ Strong</span>
                    <code>{s.good}</code>
                  </div>
                </div>
              )}
              {s.followUps && (
                <ul className="guide-list">
                  {s.followUps.map((f, j) => <li key={j}><code>{f}</code></li>)}
                </ul>
              )}
              {s.steps && (
                <ol className="guide-list">
                  {s.steps.map((st, j) => <li key={j}>{st}</li>)}
                </ol>
              )}
            </div>
          ))}
          <div className="guide-section guide-recap">
            <h3>🏆 Quick Recap</h3>
            <ul className="guide-list">
              <li>Be <strong>specific</strong> about what you want</li>
              <li>Assign the AI a <strong>role</strong></li>
              <li>Specify the <strong>format</strong> (list, table, steps…)</li>
              <li>Give <strong>context</strong> and <strong>examples</strong></li>
              <li>Ask it to <strong>think step by step</strong> for hard problems</li>
              <li><strong>Iterate</strong> — refine your prompt if needed</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
