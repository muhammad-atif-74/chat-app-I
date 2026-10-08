"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { getSession, getUserSettings, logoutUser, type SessionUser } from "@/lib/auth-client"

type AuthContextValue = { user: SessionUser | null; loading: boolean; settingsLoading: boolean; hasSettings: boolean; refreshSettings: () => Promise<void>; logout: () => void }
const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [hasSettings, setHasSettings] = useState(false)
  const refreshSettings = useCallback(async () => { setSettingsLoading(true); try { setHasSettings(Boolean(await getUserSettings())) } catch { setHasSettings(false) } finally { setSettingsLoading(false) } }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const session = getSession()
      setUser(session?.user || null)
      setLoading(false)
      if (session) void refreshSettings()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [refreshSettings])
  const value = useMemo(() => ({ user, loading, settingsLoading, hasSettings, refreshSettings, logout: () => { logoutUser(); setUser(null); setHasSettings(false) } }), [user, loading, settingsLoading, hasSettings, refreshSettings])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error("useAuth must be used inside AuthProvider"); return context }
