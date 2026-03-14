import { useState, useEffect } from 'react'
import { API_BASE } from '../config'
import './TranslationPage.css'

interface Language {
  code: string
  name: string
}

const COMMON_LANGUAGES: Language[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh-Hans', name: 'Chinese (Simplified)' },
  { code: 'zh-Hant', name: 'Chinese (Traditional)' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'vi', name: 'Vietnamese' },
]

export function TranslationPage() {
  const [sourceText, setSourceText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [sourceLang, setSourceLang] = useState('')
  const [targetLang, setTargetLang] = useState('es')
  const [detectedLang, setDetectedLang] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [languages, setLanguages] = useState<Language[]>(COMMON_LANGUAGES)

  useEffect(() => {
    fetch(`${API_BASE}/api/translate/languages`)
      .then(r => r.json())
      .then((data: { translation: Record<string, { name: string }> }) => {
        if (data?.translation) {
          const langs = Object.entries(data.translation).map(([code, info]) => ({
            code,
            name: info.name,
          }))
          langs.sort((a, b) => a.name.localeCompare(b.name))
          setLanguages(langs)
        }
      })
      .catch(() => {
        // fallback to hardcoded list
      })
  }, [])

  async function translate() {
    if (!sourceText.trim() || isLoading) return
    setIsLoading(true)
    setError(null)
    setTranslatedText('')
    setDetectedLang('')
    try {
      const res = await fetch(`${API_BASE}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sourceText, targetLanguage: targetLang, sourceLanguage: sourceLang || null }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Translation failed'); return }
      setTranslatedText(data.translatedText ?? '')
      if (data.detectedLanguage) setDetectedLang(data.detectedLanguage)
    } catch {
      setError('Translation request failed')
    } finally {
      setIsLoading(false)
    }
  }

  function swapLanguages() {
    if (!sourceLang && !detectedLang) return
    const detected = detectedLang || sourceLang
    setSourceLang(targetLang)
    setTargetLang(detected)
    setSourceText(translatedText)
    setTranslatedText('')
    setDetectedLang('')
  }

  return (
    <div className="translation-page">
      <div className="translation-header">
        <h1>🌐 Language Translation</h1>
        <p>Powered by Azure AI Language Service</p>
      </div>

      <div className="translation-body">
        <div className="translation-lang-bar">
          <select
            className="lang-select"
            value={sourceLang}
            onChange={e => setSourceLang(e.target.value)}
          >
            <option value="">Auto-detect</option>
            {languages.map(l => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
          <button className="swap-btn" onClick={swapLanguages} title="Swap languages" disabled={isLoading}>⇄</button>
          <select
            className="lang-select"
            value={targetLang}
            onChange={e => setTargetLang(e.target.value)}
          >
            {languages.map(l => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </div>

        <div className="translation-panels">
          <div className="translation-panel">
            <div className="panel-label">
              {sourceLang
                ? languages.find(l => l.code === sourceLang)?.name ?? sourceLang
                : detectedLang
                  ? `Auto-detected: ${languages.find(l => l.code === detectedLang)?.name ?? detectedLang}`
                  : 'Source text'}
            </div>
            <textarea
              className="translation-textarea"
              value={sourceText}
              onChange={e => setSourceText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && e.ctrlKey && translate()}
              placeholder="Enter text to translate…"
              rows={8}
            />
            <div className="panel-footer">
              <span className="char-count">{sourceText.length} characters</span>
              <button className="translate-btn" onClick={translate} disabled={isLoading || !sourceText.trim()}>
                {isLoading ? 'Translating…' : 'Translate'}
              </button>
            </div>
          </div>

          <div className="translation-panel output-panel">
            <div className="panel-label">
              {languages.find(l => l.code === targetLang)?.name ?? targetLang}
            </div>
            <textarea
              className="translation-textarea"
              value={translatedText}
              readOnly
              placeholder="Translation will appear here…"
              rows={8}
            />
            <div className="panel-footer">
              {translatedText && (
                <button
                  className="copy-btn"
                  onClick={() => navigator.clipboard.writeText(translatedText)}
                  title="Copy to clipboard"
                >
                  📋 Copy
                </button>
              )}
            </div>
          </div>
        </div>

        {error && <div className="translation-error">⚠ {error}</div>}
      </div>
    </div>
  )
}
