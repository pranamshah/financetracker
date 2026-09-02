import { createContext, useContext, useEffect, useState } from 'react'
import { api } from '../lib/api.js'

const SessionContext = createContext(null)
const KEY = 'ft_session'

export function SessionProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (session) localStorage.setItem(KEY, JSON.stringify(session))
    else localStorage.removeItem(KEY)
  }, [session])

  // Self-heal after a database change: if the stored member id no longer
  // exists in the current database, log out so the person signs in again and
  // gets a valid id (prevents foreign-key errors when saving).
  useEffect(() => {
    if (!session) return
    api.members()
      .then((list) => {
        if (Array.isArray(list) && list.length && !list.some((m) => m.id === session.id)) {
          setSession(null)
        }
      })
      .catch(() => {}) // network hiccup: keep the session
  }, []) // once on load

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
