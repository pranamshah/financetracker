import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api.js'
import { useSession } from '../../context/SessionContext.jsx'
import { fmt } from '../../lib/calc.js'
import { useAutoRefresh } from '../../lib/useAutoRefresh.js'
import MicButton from '../../components/MicButton.jsx'

export default function DailyEntries({ scopeId }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  const load = (silent = false) => {
    if (!silent) setLoading(true)
    api.entries({ memberId: scopeId, date: 'today' })
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [scopeId])
  useAutoRefresh(() => load(true))

  const total = entries.reduce((s, e) => s + Number(e.amount), 0)

  return (
    <div>
      <QuickEntry onSaved={() => load(true)} />

      {!loading && entries.length > 0 && (
        <div className="mb-3 rounded-2xl bg-green-50 border border-green-100 px-4 py-3">
          <p className="text-xs text-green-700 font-medium">Collected today</p>
          <p className="text-2xl font-bold text-money-in">₹{fmt(total)}</p>
        </div>
      )}

      {loading && <p className="text-slate-400 text-center py-8">Loading…</p>}
      {!loading && entries.length === 0 && (
        <p className="text-center text-slate-400 py-10">No entries yet today</p>
      )}

      <ul className="space-y-2">
        {entries.map((e) => (
          <li key={e.id} className="card px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 truncate">{e.customer_name}</p>
              <p className="text-xs text-slate-400 truncate">
                {new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {e.member_name ? ` · ${e.member_name}` : ''}
              </p>
            </div>
            <span className="font-bold text-money-in shrink-0 whitespace-nowrap">+₹{fmt(e.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Always-visible quick entry: type/pick customer, type amount, press Enter.
// Saves and returns focus to the customer field for the next entry.
function QuickEntry({ onSaved }) {
  const { session } = useSession()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [customer, setCustomer] = useState(null)
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [allCustomers, setAllCustomers] = useState([])
  const nameRef = useRef(null)
  const amountRef = useRef(null)

  // Load the customer list once, then filter locally so suggestions appear
  // instantly on every keystroke.
  useEffect(() => { api.customers().then(setAllCustomers).catch(() => {}) }, [])

  useEffect(() => {
    const q = search.trim().toLowerCase()
    if (customer || !q) { setResults([]); return }
    const matches = allCustomers.filter((c) => c.name.toLowerCase().includes(q))
    // Names that START with the typed text come first.
    matches.sort((a, b) => {
      const as = a.name.toLowerCase().startsWith(q) ? 0 : 1
      const bs = b.name.toLowerCase().startsWith(q) ? 0 : 1
      return as - bs || a.name.localeCompare(b.name)
    })
    setResults(matches.slice(0, 8))
  }, [search, customer, allCustomers])

  const pick = (c) => {
    setCustomer(c)
    setSearch(c.name)
    setResults([])
    setTimeout(() => amountRef.current?.focus(), 0)
  }

  const reset = () => { setCustomer(null); setSearch(''); setResults([]); setAmount('') }

  const save = async () => {
    setMsg(null)
    let c = customer
    // If not picked but the typed name matches exactly one customer, use it.
    if (!c) {
      const list = await api.customers(search).catch(() => [])
      const exact = list.filter((x) => x.name.toLowerCase() === search.trim().toLowerCase())
      if (exact.length === 1) c = exact[0]
      else if (list.length === 1) c = list[0]
    }
    if (!c) { setMsg('Pick a customer from the list'); return }
    if (!amount || Number(amount) <= 0) { setMsg('Enter an amount'); return }
    setSaving(true)
    try {
      const r = await api.collect({ customer_id: c.id, member_id: session.id, amount: Number(amount) })
      setMsg(`Saved ₹${fmt(amount)} for ${c.name}${r.split > 1 ? ` (split across ${r.split} loans)` : ''}`)
      reset()
      onSaved?.()
      setTimeout(() => nameRef.current?.focus(), 0)
    } catch (e) {
      setMsg(e.message)
    } finally {
      setSaving(false)
    }
  }

  const onAmountKey = (e) => { if (e.key === 'Enter') { e.preventDefault(); save() } }

  return (
    <div className="card p-3 mb-3">
      {/* Name + amount on one line */}
      <div className="flex items-stretch gap-2">
        <div className="relative flex-1 min-w-0">
          <input
            ref={nameRef}
            value={search}
            onChange={(e) => { setSearch(e.target.value); if (customer) setCustomer(null) }}
            placeholder="Name"
            className="w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-money-in"
          />
          {results.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl overflow-hidden divide-y shadow-lg max-h-64 overflow-y-auto">
              {results.map((c) => (
                <li key={c.id}>
                  <button onClick={() => pick(c)} className="w-full text-left px-3 py-2.5 hover:bg-slate-50">{c.name}</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-slate-200 px-2 focus-within:border-money-in w-32 shrink-0">
          <span className="text-slate-400">₹</span>
          <input
            ref={amountRef}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={onAmountKey}
            inputMode="decimal"
            placeholder="Amount"
            className="w-full py-3 outline-none bg-transparent text-lg font-semibold min-w-0"
          />
          <MicButton onResult={(t) => { const n = (t || '').replace(/[^0-9.]/g, ''); if (n) setAmount(n) }} />
        </div>

        <button onClick={save} disabled={saving}
          className="shrink-0 w-12 rounded-xl bg-money-in text-white flex items-center justify-center disabled:opacity-50">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </button>
      </div>

      <p className="text-[11px] text-slate-400 mt-1.5 px-1">Type a name, enter amount, press Enter to save.</p>
      {msg && <p className="text-xs mt-1 text-slate-500 px-1">{msg}</p>}
    </div>
  )
}
