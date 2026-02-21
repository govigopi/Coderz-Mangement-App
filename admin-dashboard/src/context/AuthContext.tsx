import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  auth,
  clearAuthSession,
  getRememberMeFlag,
  getStoredRefreshToken,
  getStoredToken,
  getStoredUserRaw,
  setAuthSession,
  type User,
} from '../api/client'

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string, role: 'superadmin' | 'admin' | 'staff', rememberMe: boolean) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getStoredToken()
    const saved = getStoredUserRaw()
    if (token && saved) {
      try {
        setUser(JSON.parse(saved))
      } catch {
        clearAuthSession()
      }
      auth.me().then((r) => {
        setUser(r.data.user)
        const rememberMe = getRememberMeFlag()
        const refreshToken = getStoredRefreshToken()
        if (refreshToken) {
          setAuthSession({ token, refreshToken, user: r.data.user }, rememberMe)
        }
      }).catch(() => {
        clearAuthSession()
        setUser(null)
      }).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string, role: 'superadmin' | 'admin' | 'staff', rememberMe: boolean) => {
    const { data } = await auth.login(email, password, role, rememberMe)
    setAuthSession(data, rememberMe)
    setUser(data.user)
  }

  const logout = async () => {
    const refreshToken = getStoredRefreshToken()
    try {
      await auth.logout(refreshToken || undefined)
    } catch {
      // Logout should still clear local session even if backend call fails.
    }
    clearAuthSession()
    setUser(null)
    window.location.href = '/login'
  }

  useEffect(() => {
    if (!user) return

    let timeoutId: number
    const resetTimer = () => {
      window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => {
        logout()
      }, INACTIVITY_TIMEOUT_MS)
    }

    const events: Array<keyof WindowEventMap> = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach((event) => window.addEventListener(event, resetTimer))
    resetTimer()

    return () => {
      window.clearTimeout(timeoutId)
      events.forEach((event) => window.removeEventListener(event, resetTimer))
    }
  }, [user])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

