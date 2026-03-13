import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export interface UserInfo {
  id: number
  username: string
}

interface UserContextValue {
  user: UserInfo | null
  setUser: (user: UserInfo | null) => void
  logout: () => void
}

const UserContext = createContext<UserContextValue | null>(null)

const STORAGE_KEY = 'ai-playground-user'

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserInfo | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? (JSON.parse(stored) as UserInfo) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [user])

  function setUser(u: UserInfo | null) {
    setUserState(u)
  }

  function logout() {
    setUserState(null)
  }

  return <UserContext.Provider value={{ user, setUser, logout }}>{children}</UserContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUser(): UserContextValue {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used inside UserProvider')
  return ctx
}