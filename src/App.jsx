import { Routes, Route, Navigate } from 'react-router-dom'
import { useSession } from './context/SessionContext.jsx'
import NameSelect from './pages/NameSelect.jsx'
import Dashboard from './pages/Dashboard.jsx'
import CustomerDetail from './pages/CustomerDetail.jsx'

function RequireSession({ children }) {
  const { session } = useSession()
  if (!session) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { session } = useSession()
  return (
    <Routes>
      <Route path="/" element={session ? <Navigate to="/app" replace /> : <NameSelect />} />
      <Route path="/app" element={<RequireSession><Dashboard /></RequireSession>} />
      <Route path="/customer/:id" element={<RequireSession><CustomerDetail /></RequireSession>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
