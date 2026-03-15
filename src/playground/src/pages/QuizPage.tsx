import { useState, useEffect, useCallback } from 'react'
import { useUser } from '../contexts/UserContext'
import { API_BASE } from '../config'
import './QuizPage.css'

interface QuizState {
  status: 'waiting' | 'inprogress' | 'finished'
  currentQuestion: number
  totalQuestions: number
  question: { text: string; options: string[] } | null
  hasAnswered: boolean
}

interface LeaderboardEntry {
  userId: number
  username: string
  score: number
}

export function QuizPage() {
  const { user } = useUser()
  const [state, setState] = useState<QuizState | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [result, setResult] = useState<boolean | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/quiz/state?userId=${user?.id ?? ''}`)
      const data: QuizState = await res.json()
      setState(prev => {
        if (prev && prev.currentQuestion !== data.currentQuestion) {
          setSelected(null)
          setResult(null)
        }
        return data
      })
    } catch {
      // ignore
    }
  }, [user])

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/quiz/leaderboard`)
      const data: LeaderboardEntry[] = await res.json()
      setLeaderboard(data)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchState()
    fetchLeaderboard()
    const id = setInterval(() => {
      fetchState()
      fetchLeaderboard()
    }, 2000)
    return () => clearInterval(id)
  }, [fetchState, fetchLeaderboard])

  async function handleAnswer(index: number) {
    if (!user || result !== null || state?.hasAnswered) return
    setSelected(index)
    try {
      const res = await fetch(`${API_BASE}/api/quiz/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, answer: index }),
      })
      const data = await res.json()
      if (res.ok) setResult(data.correct)
    } catch {
      // ignore
    }
  }

  if (!state) return <div className="quiz-page"><p className="quiz-loading">Loading quiz…</p></div>

  return (
    <div className="quiz-page">
      <h1 className="quiz-title">🧠 AI Quiz</h1>

      {state.status === 'waiting' && (
        <div className="quiz-waiting">
          <div className="quiz-waiting-icon">⏳</div>
          <h2>Waiting for admin to start the quiz…</h2>
          <p>Get ready! 10 questions on AI basics and Responsible AI.</p>
        </div>
      )}

      {state.status === 'inprogress' && state.question && (
        <div className="quiz-question-card">
          <div className="quiz-progress">
            Question {state.currentQuestion + 1} / {state.totalQuestions}
            <div className="quiz-progress-bar">
              <div className="quiz-progress-fill" style={{ width: `${((state.currentQuestion + 1) / state.totalQuestions) * 100}%` }} />
            </div>
          </div>
          <h2 className="quiz-question-text">{state.question.text}</h2>
          <div className="quiz-options">
            {state.question.options.map((opt, i) => {
              let cls = 'quiz-option'
              if (state.hasAnswered || result !== null) {
                if (selected === i && result === true) cls += ' correct'
                else if (selected === i && result === false) cls += ' incorrect'
              }
              if (selected === i && result === null) cls += ' selected'
              return (
                <button
                  key={i}
                  className={cls}
                  onClick={() => handleAnswer(i)}
                  disabled={state.hasAnswered || result !== null}
                >
                  <span className="quiz-option-letter">{String.fromCharCode(65 + i)}</span>
                  {opt}
                </button>
              )
            })}
          </div>
          {result === true && <p className="quiz-feedback correct">✅ Correct!</p>}
          {result === false && <p className="quiz-feedback incorrect">❌ Wrong answer</p>}
          {state.hasAnswered && result === null && <p className="quiz-feedback answered">✔ Answer submitted — wait for next question</p>}
        </div>
      )}

      {state.status === 'finished' && (
        <div className="quiz-finished">
          <h2>🎉 Quiz Complete!</h2>
          {user && (
            <p className="quiz-my-score">
              Your score: <strong>{leaderboard.find(e => e.userId === user.id)?.score ?? 0}</strong> / {state.totalQuestions}
            </p>
          )}
        </div>
      )}

      <div className="quiz-leaderboard">
        <h3>🏆 Leaderboard</h3>
        {leaderboard.length === 0 ? (
          <p className="quiz-no-scores">No scores yet</p>
        ) : (
          <ol className="quiz-leaderboard-list">
            {leaderboard.map((entry, i) => (
              <li key={entry.userId} className={`quiz-lb-entry${user?.id === entry.userId ? ' me' : ''}`}>
                <span className="quiz-lb-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                <span className="quiz-lb-name">{entry.username}</span>
                <span className="quiz-lb-score">{entry.score} / {state.totalQuestions}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
