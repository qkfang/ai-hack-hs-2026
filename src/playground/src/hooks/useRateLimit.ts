import { useState, useEffect, useCallback } from 'react'

export function useRateLimit() {
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown(c => Math.max(0, c - 1)), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const triggerRateLimit = useCallback((seconds: number) => {
    setCountdown(Math.max(1, Math.ceil(seconds)))
  }, [])

  return {
    isRateLimited: countdown > 0,
    countdown,
    triggerRateLimit,
  }
}
