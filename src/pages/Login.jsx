import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useSession } from '../context/SessionContext.jsx'

export default function Login() {
  const [username, setUsername] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const { login } = useSession()
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!username.trim()) return setError('Enter your username')
    setBusy(true)
    try {
      const member = await api.login(username.trim())
      login(member)
      navigate('/app')
    } catch (err) {
      setError(err.message === 'Username not found' ? 'Username not found' : err.message)
      setBusy(false)
    }
  }

  return (
    <div className="min-h-full flex flex-col justify-center px-6 max-w-sm mx-auto animate-in"
         style={{ background: 'radial-gradient(120% 60% at 50% 0%, #dcfce7 0%, #f1f5f9 55%)' }}>
      <div className="text-center mb-8">
        <div className="mx-auto mb-5 h-20 w-20 rounded-3xl bg-money-in flex items-center justify-center text-white text-4xl font-bold shadow-lg shadow-green-200">₹</div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Finance Tracker</h1>
        <p className="text-slate-500 mt-2">Enter your username to continue</p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="username"
          className="field text-lg text-center"
        />
        {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2 text-center">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full text-lg">
          {busy ? 'Checking…' : 'Continue'}
        </button>
      </form>

      <p className="text-center text-xs text-slate-400 mt-8">Trusted internal use · no password needed</p>
    </div>
  )
}
