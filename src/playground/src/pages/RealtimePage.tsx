import { useState, useRef, useEffect } from 'react'
import { API_BASE } from '../config'
import './RealtimePage.css'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const VOICE_OPTIONS = [
  { value: 'alloy', label: 'Alloy — neutral, balanced' },
  { value: 'echo', label: 'Echo — clear, precise' },
  { value: 'fable', label: 'Fable — warm, expressive' },
  { value: 'onyx', label: 'Onyx — deep, authoritative' },
  { value: 'nova', label: 'Nova — bright, energetic' },
  { value: 'shimmer', label: 'Shimmer — soft, calm' },
]

// Map Azure OpenAI voice names to Azure Speech neural voices for TTS playback
const VOICE_MAP: Record<string, string> = {
  alloy: 'en-US-AriaNeural',
  echo: 'en-US-GuyNeural',
  fable: 'en-US-JennyNeural',
  onyx: 'en-US-DavisNeural',
  nova: 'en-US-SaraNeural',
  shimmer: 'en-US-MichelleNeural',
}

const DEFAULT_SYSTEM_PROMPT =
  'You are a helpful AI assistant. Respond concisely and clearly.'

export function RealtimePage() {
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT)
  const [selectedVoice, setSelectedVoice] = useState('alloy')
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const currentAudioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return
    setMessages(prev => [...prev, { role: 'user', content: trimmed }])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: trimmed }],
          systemPrompt,
          model: 'gpt-4o-realtime-preview',
        }),
      })
      if (!res.ok || !res.body) throw new Error(`Server error: ${res.status}`)

      setMessages(prev => [...prev, { role: 'assistant', content: '' }])
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullResponse = ''

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
            const chunk = event.content as string
            fullResponse += chunk
            setMessages(prev => {
              const copy = [...prev]
              const last = copy[copy.length - 1]
              if (last?.role === 'assistant')
                copy[copy.length - 1] = { ...last, content: last.content + chunk }
              return copy
            })
          } else if (event.type === 'error') {
            setMessages(prev => {
              const copy = [...prev]
              const last = copy[copy.length - 1]
              if (last?.role === 'assistant')
                copy[copy.length - 1] = { ...last, content: `Error: ${event.message as string}` }
              return copy
            })
          }
        }
      }

      if (voiceEnabled && fullResponse) {
        await speakResponse(fullResponse)
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  async function speakResponse(text: string) {
    const azureVoice = VOICE_MAP[selectedVoice] ?? 'en-US-AriaNeural'
    setIsSpeaking(true)
    try {
      const res = await fetch(`${API_BASE}/api/speech/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: azureVoice }),
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      currentAudioRef.current = audio
      audio.onended = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(url)
      }
      audio.onerror = () => setIsSpeaking(false)
      await audio.play()
    } catch {
      setIsSpeaking(false)
    }
  }

  function stopSpeaking() {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }
    setIsSpeaking(false)
  }

  function startRecording() {
    const SpeechRecognitionAPI =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition as (new () => SpeechRecognition) | undefined

    if (!SpeechRecognitionAPI) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Speech recognition is not supported in this browser.' },
      ])
      return
    }
    const recognition: SpeechRecognition = new SpeechRecognitionAPI()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript
      sendMessage(transcript)
    }
    recognition.onerror = () => setIsRecording(false)
    recognition.onend = () => setIsRecording(false)
    recognition.start()
    recognitionRef.current = recognition
    setIsRecording(true)
  }

  function stopRecording() {
    recognitionRef.current?.stop()
    setIsRecording(false)
  }

  function clearConversation() {
    stopSpeaking()
    setMessages([])
  }

  return (
    <div className="realtime-page">
      <div className="realtime-header">
        <h1>⚡ GPT Realtime</h1>
        <p>Voice-enabled chat with GPT-4o Realtime — Azure AI Foundry</p>
      </div>

      <div className="realtime-layout">
        {/* Settings panel */}
        <div className={`realtime-settings ${settingsOpen ? 'open' : 'collapsed'}`}>
          <button
            className="settings-toggle"
            onClick={() => setSettingsOpen(p => !p)}
          >
            ⚙ Settings {settingsOpen ? '▲' : '▼'}
          </button>

          {settingsOpen && (
            <>
              <div className="settings-section">
                <label className="settings-label">System Prompt</label>
                <textarea
                  className="settings-textarea"
                  value={systemPrompt}
                  onChange={e => setSystemPrompt(e.target.value)}
                  rows={4}
                  placeholder="Enter system instructions…"
                />
              </div>

              <div className="settings-section">
                <label className="settings-label">Voice</label>
                <select
                  className="settings-select"
                  value={selectedVoice}
                  onChange={e => setSelectedVoice(e.target.value)}
                >
                  {VOICE_OPTIONS.map(v => (
                    <option key={v.value} value={v.value}>{v.label}</option>
                  ))}
                </select>
              </div>

              <div className="settings-section settings-toggle-row">
                <label className="settings-label">Voice output</label>
                <button
                  className={`toggle-btn ${voiceEnabled ? 'on' : 'off'}`}
                  onClick={() => setVoiceEnabled(p => !p)}
                >
                  {voiceEnabled ? '🔊 On' : '🔇 Off'}
                </button>
              </div>

              {messages.length > 0 && (
                <button className="clear-btn" onClick={clearConversation}>
                  🗑 Clear conversation
                </button>
              )}
            </>
          )}
        </div>

        {/* Chat panel */}
        <div className="realtime-chat">
          <div className="realtime-messages">
            {messages.length === 0 && (
              <div className="realtime-empty">
                <p>Start a voice or text conversation</p>
                <p className="realtime-hint">Press the mic button or type below</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`rt-bubble ${m.role}`}>
                <div className="rt-bubble-role">{m.role === 'user' ? 'You' : 'AI'}</div>
                <div className="rt-bubble-content">{m.content}</div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="rt-bubble assistant">
                <div className="rt-bubble-content rt-thinking">Thinking…</div>
              </div>
            )}
            {isSpeaking && (
              <div className="rt-speaking-indicator">
                🔊 Speaking…
                <button className="stop-speak-btn" onClick={stopSpeaking}>⏹ Stop</button>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="realtime-input-bar">
            <button
              className={`mic-btn ${isRecording ? 'recording' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
              title={isRecording ? 'Stop recording' : 'Speak'}
            >
              {isRecording ? '⏹' : '🎤'}
            </button>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
              placeholder="Type a message or press 🎤 to speak…"
              disabled={isLoading || isRecording}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={isLoading || isRecording || !input.trim()}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
