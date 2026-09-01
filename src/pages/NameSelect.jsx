import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useSession } from '../context/SessionContext.jsx'

export default function NameSelect() {
  const [employees, setEmployees] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const { login } = useSession()
  const navigate = useNavigate()

  useEffect(() => {
    api.employees()
      .then(setEmployees)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const pick = (emp) => {
    login(emp)
    navigate('/app')
  }

  return (
    <div className="min-h-full safe-top px-5 py-10 max-w-lg mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-money-in">Finance Tracker</h1>
        <p className="text-slate-500 mt-1">Tap your name to continue</p>
      </div>

      {loading && <p className="text-center text-slate-400">Loading…</p>}
      {error && (
        <p className="text-center text-red-600 bg-red-50 rounded-lg p-3">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        {employees.map((emp) => (
          <button
            key={emp.id}
            onClick={() => pick(emp)}
            className="relative rounded-2xl bg-white shadow-sm border border-slate-200 py-8 px-4 text-lg font-semibold text-slate-800 active:scale-95 transition"
          >
            {emp.role === 'admin' && (
              <span className="absolute top-2 right-2 text-[10px] font-bold uppercase bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                Admin
              </span>
            )}
            {emp.name}
          </button>
        ))}
      </div>

      {!loading && !error && employees.length === 0 && (
        <p className="text-center text-slate-400 mt-6">
          No employees found. Seed the <code>employees</code> table first.
        </p>
      )}
    </div>
  )
}
