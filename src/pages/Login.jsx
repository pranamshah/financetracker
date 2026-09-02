import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useSession } from '../context/SessionContext.jsx'

export default function Login() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const { login } = useSession()
  const navigate = useNavigate()

  const submit = async (value) => {
    setError(null)
    setBusy(true)
    try {
      const member = await api.login(value)
      login(member)
      navigate('/app')
    } catch (err) {
      setError(err.message || 'Wrong PIN')
      setPin('')
      setBusy(false)
    }
  }

  const press = (d) => {
    if (busy) return
    const next = (pin + d).slice(0, 4)
    setPin(next)
    setError(null)
    if (next.length === 4) submit(next)
  }
  const back = () => setPin((p) => p.slice(0, -1))

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

  return (
    <div className="min-h-full flex flex-col justify-center px-6 max-w-sm mx-auto"
         style={{ background: 'radial-gradient(120% 55% at 50% 0%, #dcfce7 0%, #f1f5f9 55%)' }}>
      <div className="text-center mb-6">
        <div className="mx-auto mb-4 h-16 w-16 rounded-3xl bg-money-in flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-green-200">₹</div>
        <h1 className="text-2xl font-extrabold text-slate-800">Finance Tracker</h1>
        <p className="text-slate-500 mt-1">Enter your 4-digit PIN</p>
      </div>

      {/* PIN boxes — show each digit as it's typed */}
      <div className="flex justify-center gap-3 mb-5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-14 w-12 rounded-xl border-2 flex items-center justify-center text-2xl font-bold bg-white ${
            pin.length > i ? 'border-money-in text-slate-800' : 'border-slate-300 text-slate-300'
          }`}>
            {pin[i] ?? ''}
          </div>
        ))}
      </div>

      {error && <p className="text-center text-red-600 text-sm mb-3">{error}</p>}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3">
        {keys.map((k, i) =>
          k === '' ? <div key={i} /> : (
            <button
              key={i}
              onClick={() => (k === '⌫' ? back() : press(k))}
              disabled={busy}
              className="h-16 rounded-2xl bg-white border border-slate-200 text-2xl font-semibold text-slate-700 active:bg-slate-100 shadow-sm disabled:opacity-50"
            >
              {k}
            </button>
          )
        )}
      </div>
    </div>
  )
}
