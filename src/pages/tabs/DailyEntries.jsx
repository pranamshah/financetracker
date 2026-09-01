import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { useSession } from '../../context/SessionContext.jsx'
import { fmt } from '../../lib/calc.js'
import MicButton from '../../components/MicButton.jsx'

export default function DailyEntries({ scopeId }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  const load = () => {
    setLoading(true)
    api.entries({ memberId: scopeId, date: 'today' })
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [scopeId])

  const total = entries.reduce((s, e) => s + Number(e.amount), 0)

  return (
    <div>
      {!loading && entries.length > 0 && (
        <div className="mb-3 rounded-xl bg-green-50 border border-green-100 px-4 py-3">
          <p className="text-xs text-green-700 font-medium">Collected today</p>
          <p className="text-2xl font-bold text-money-in">₹{fmt(total)}</p>
        </div>
      )}

      {loading && <p className="text-slate-400 text-center py-8">Loading…</p>}

      {!loading && entries.length === 0 && (
        <p className="text-center text-slate-400 py-16">No entries yet today</p>
      )}

      <ul className="space-y-2">
        {entries.map((e) => (
          <li key={e.id} className="rounded-xl bg-white border border-slate-200 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-800">{e.customer_name}</p>
              <p className="text-xs text-slate-400">
                {new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {e.member_name ? ` · ${e.member_name}` : ''}
              </p>
            </div>
            <span className="font-bold text-money-in">+₹{fmt(e.amount)}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => setShowNew(true)}
        aria-label="New entry"
        className="fixed bottom-24 right-5 h-14 w-14 rounded-full bg-money-in text-white shadow-lg flex items-center justify-center active:scale-95 transition z-20"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {showNew && (
        <NewEntryModal
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); load() }}
        />
      )}
    </div>
  )
}

function NewEntryModal({ onClose, onSaved }) {
  const { session } = useSession()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [customer, setCustomer] = useState(null)
  const [loans, setLoans] = useState([])
  const [loanId, setLoanId] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (customer || search.trim().length < 1) { setResults([]); return }
    const t = setTimeout(() => {
      api.customers(search).then(setResults).catch(() => setResults([]))
    }, 250)
    return () => clearTimeout(t)
  }, [search, customer])

  const selectCustomer = async (c) => {
    setCustomer(c)
    setSearch(c.name)
    setResults([])
    try {
      const active = await api.loans(c.id, 'active')
      setLoans(active)
      if (active.length === 1) setLoanId(active[0].id)
    } catch { setLoans([]) }
  }

  const reset = () => {
    setCustomer(null); setLoans([]); setLoanId(''); setSearch('')
  }

  const save = async () => {
    setError(null)
    if (!customer) return setError('Select a customer')
    if (!loanId) return setError('Select a loan')
    if (!amount || Number(amount) <= 0) return setError('Enter a valid amount')
    setSaving(true)
    try {
      await api.createEntry({
        loan_id: loanId,
        customer_id: customer.id,
        member_id: session.id,
        amount: Number(amount),
        note: note || null
      })
      onSaved()
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  const parseAmount = (text) => {
    const n = (text || '').replace(/[^0-9.]/g, '')
    if (n) setAmount(n)
  }

  return (
    <div className="fixed inset-0 z-30 bg-black/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">New Entry</h2>
          <button onClick={onClose} className="text-slate-400 text-2xl leading-none">×</button>
        </div>

        {/* Customer search */}
        <label className="text-sm font-medium text-slate-600">Customer</label>
        <div className="mt-1 flex items-center gap-1 rounded-xl border border-slate-300 px-3">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); if (customer) reset() }}
            placeholder="Search existing customer"
            className="flex-1 py-3 outline-none bg-transparent"
          />
          <MicButton onResult={(t) => setSearch(t)} />
        </div>
        {results.length > 0 && (
          <ul className="mt-1 border border-slate-200 rounded-xl overflow-hidden divide-y">
            {results.slice(0, 6).map((c) => (
              <li key={c.id}>
                <button onClick={() => selectCustomer(c)} className="w-full text-left px-3 py-2.5 hover:bg-slate-50">
                  {c.name}
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Loan select */}
        {customer && (
          <div className="mt-4">
            <label className="text-sm font-medium text-slate-600">Loan</label>
            {loans.length === 0 ? (
              <p className="text-sm text-amber-600 mt-1">No active loan for this customer.</p>
            ) : (
              <select
                value={loanId}
                onChange={(e) => setLoanId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-3 bg-white"
              >
                <option value="">Select loan…</option>
                {loans.map((l) => (
                  <option key={l.id} value={l.id}>
                    ₹{fmt(l.total_to_receive)} · bal ₹{fmt(l.total_to_receive - l.collected)} · {l.frequency}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Amount */}
        <div className="mt-4">
          <label className="text-sm font-medium text-slate-600">Amount collected</label>
          <div className="mt-1 flex items-center gap-1 rounded-xl border border-slate-300 px-3">
            <span className="text-slate-400">₹</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              placeholder="0"
              className="flex-1 py-3 outline-none bg-transparent text-lg font-semibold"
            />
            <MicButton onResult={parseAmount} />
          </div>
        </div>

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-3 outline-none"
        />

        {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

        <button
          onClick={save}
          disabled={saving}
          className="mt-5 w-full rounded-xl bg-money-in text-white font-semibold py-3.5 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Entry'}
        </button>
      </div>
    </div>
  )
}
