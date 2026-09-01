import { createContext, useContext, useEffect, useState } from 'react'

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

  const login = (employee) =>
    setSession({ id: employee.id, name: employee.name, role: employee.role })
  const logout = () => setSession(null)

  const isAdmin = session?.role === 'admin'

  return (
    <SessionContext.Provider value={{ session, login, logout, isAdmin }}>
      {children}
    </SessionContext.Provider>
  )
}

export const useSession = () => useContext(SessionContext)
