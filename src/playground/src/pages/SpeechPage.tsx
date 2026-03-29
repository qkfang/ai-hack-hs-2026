import { useState, useRef } from 'react'
import { API_BASE } from '../config'
import { useRateLimit } from '../hooks/useRateLimit'
import './SpeechPage.css'

const VOICES = [
  { value: 'en-US-JennyNeural', label: 'Jenny (US English, Female)' },
  { value: 'en-US-GuyNeural', label: 'Guy (US English, Male)' },
  { value: 'en-US-AriaNeural', label: 'Aria (US English, Female)' },
  { value: 'en-US-DavisNeural', label: 'Davis (US English, Male)' },
  { value: 'en-GB-SoniaNeural', label: 'Sonia (UK English, Female)' },
  { value: 'en-GB-RyanNeural', label: 'Ryan (UK English, Male)' },
  { value: 'en-AU-NatashaNeural', label: 'Natasha (Australian English, Female)' },
  { value: 'fr-FR-DeniseNeural', label: 'Denise (French, Female)' },
  { value: 'de-DE-KatjaNeural', label: 'Katja (German, Female)' },
  { value: 'es-ES-ElviraNeural', label: 'Elvira (Spanish, Female)' },
  { value: 'it-IT-ElsaNeural', label: 'Elsa (Italian, Female)' },
  { value: 'ja-JP-NanamiNeural', label: 'Nanami (Japanese, Female)' },
  { value: 'zh-CN-XiaoxiaoNeural', label: 'Xiaoxiao (Chinese, Female)' },
  { value: 'ko-KR-SunHiNeural', label: 'SunHi (Korean, Female)' },
  { value: 'pt-BR-FranciscaNeural', label: 'Francisca (Portuguese, Female)' },
  { value: 'ar-EG-SalmaNeural', label: 'Salma (Arabic, Female)' },
]

export function SpeechPage() {
  const [text, setText] = useState('')
  const [voice, setVoice] = useState('en-US-JennyNeural')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const { isRateLimited, countdown, triggerRateLimit } = useRateLimit()

  // Speech-to-text state
  const [isRecording, setIsRecording] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  async function synthesize() {
    if (!text.trim() || isLoading || isRateLimited) return
    setIsLoading(true)
    setError(null)
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
    try {
      const res = await fetch(`${API_BASE}/api/speech/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice }),
      })
      if (res.status === 429) {
        const data = await res.json()
        triggerRateLimit(data.retryAfter ?? 15)
        setError(data.error ?? 'Rate limit reached, please wait.')
        return
      }
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Synthesis failed')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)
      setTimeout(() => audioRef.current?.play(), 100)
    } catch {
      setError('Speech synthesis request failed')
    } finally {
      setIsLoading(false)
    }
  }

  function startRecording() {
    const SpeechRecognitionAPI =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition as (new () => SpeechRecognition) | undefined

    if (!SpeechRecognitionAPI) {
      setError('Speech recognition is not supported in this browser')
      return
    }
    const recognition: SpeechRecognition = new SpeechRecognitionAPI()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript
      setText(prev => (prev ? prev + ' ' + transcript : transcript))
    }
    recognition.onerror = () => setError('Speech recognition failed')
    recognition.onend = () => setIsRecording(false)
    recognition.start()
    recognitionRef.current = recognition
    setIsRecording(true)
  }

  function stopRecording() {
    recognitionRef.current?.stop()
    setIsRecording(false)
  }

  return (
    <div className="speech-page">
      <div className="speech-header">
        <h1>🎙️ Speech</h1>
        <p>Text-to-Speech powered by Azure Speech Service · Speech-to-Text via browser</p>
      </div>

      <div className="speech-body">
        <div className="speech-section">
          <label className="speech-label">Voice</label>
          <select
            className="speech-select"
            value={voice}
            onChange={e => setVoice(e.target.value)}
          >
            {VOICES.map(v => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
        </div>

        <div className="speech-section">
          <div className="speech-label-row">
            <label className="speech-label">Text</label>
            <button
              className={`record-btn ${isRecording ? 'recording' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
              title={isRecording ? 'Stop recording' : 'Dictate (Speech to Text)'}
            >
              {isRecording ? '⏹ Stop' : '🎤 Dictate'}
            </button>
          </div>
          <textarea
            className="speech-textarea"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Type or dictate the text you want to synthesize…"
            rows={6}
          />
          <div className="speech-footer">
            <span className="char-count">{text.length} characters</span>
            <button
              className="synthesize-btn"
              onClick={synthesize}
              disabled={isLoading || isRateLimited || !text.trim()}
            >
              {isLoading ? 'Synthesizing…' : isRateLimited ? `Wait ${countdown}s` : '▶ Synthesize'}
            </button>
          </div>
        </div>

        {audioUrl && (
          <div className="speech-audio-section">
            <label className="speech-label">Audio Output</label>
            <audio ref={audioRef} controls src={audioUrl} className="speech-audio" />
          </div>
        )}

        {error && <div className="speech-error">⚠ {error}</div>}
        {isRateLimited && !error && (
          <div className="speech-rate-limit">⏳ Please wait <strong>{countdown}s</strong> before synthesizing again.</div>
        )}
      </div>
    </div>
  )
}
