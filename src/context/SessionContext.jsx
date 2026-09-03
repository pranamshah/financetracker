import { createContext, useContext, useEffect, useRef, useState } from 'react'

const SessionContext = createContext(null)
const INACTIVITY_MS = 2 * 60 * 60 * 1000 // 2 hours

export function SessionProvider({ children }) {
  // Always start logged out — PIN required on every app open.
  const [session, setSession] = useState(null)
  const timerRef = useRef(null)

  const clearTimer = () => { if (timerRef.current) clearTimeout(timerRef.current) }

  const resetTimer = () => {
    clearTimer()
    timerRef.current = setTimeout(() => setSession(null), INACTIVITY_MS)
  }

  // Reset inactivity timer on any user interaction while logged in.
  useEffect(() => {
    if (!session) { clearTimer(); return }
    resetTimer()
    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll']
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }))
    return () => {
      clearTimer()
      events.forEach((e) => window.removeEventListener(e, resetTimer))
    }
  }, [session])

  const login = (member) =>
    setSession({ id: member.id, name: member.name, role: member.role })
  const logout = () => setSession(null)

  const isAdmin = session?.role === 'admin'

  return (
    <SessionContext.Provider value={{ session, login, logout, isAdmin }}>
      {children}
    </SessionContext.Provider>
  )
}

export const useSession = () => useContext(SessionContext)
