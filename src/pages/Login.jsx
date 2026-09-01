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
    <div className="min-h-full safe-top px-5 flex flex-col justify-center max-w-sm mx-auto">
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-money-in flex items-center justify-center text-white text-3xl font-bold">₹</div>
        <h1 className="text-2xl font-bold text-money-in">Finance Tracker</h1>
        <p className="text-slate-500 mt-1">Enter your username to continue</p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="username"
          className="w-full rounded-xl border border-slate-300 px-4 py-3.5 text-lg outline-none focus:border-money-in"
        />
        {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-money-in text-white text-lg font-semibold py-3.5 disabled:opacity-50 active:scale-[0.99] transition"
        >
          {busy ? 'Checking…' : 'Continue'}
        </button>
      </form>
    </div>
  )
}
