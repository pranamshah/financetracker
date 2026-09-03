import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api.js'
import { useSession } from '../../context/SessionContext.jsx'
import { fmt } from '../../lib/calc.js'
import { useAutoRefresh } from '../../lib/useAutoRefresh.js'
import MicButton from '../../components/MicButton.jsx'

const todayIST = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())

function dateShiftIST(n) {
  const t = todayIST()
  const [y, m, d] = t.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() - n)
  return dt.toISOString().slice(0, 10)
}

export default function DailyEntries({ scopeId }) {
  const today = todayIST()
  const yesterday = dateShiftIST(1)

  // One date controls both what is shown AND what new entries are saved as.
  const [date, setDate] = useState(today)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  const load = (silent = false) => {
    if (!silent) setLoading(true)
    api.entries({ memberId: scopeId, date })
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [scopeId, date])
  useAutoRefresh(() => load(true))

  const total = entries.reduce((s, e) => s + Number(e.amount), 0)
  const label = date === today ? 'today' : date === yesterday ? 'yesterday' : date

  return (
    <div>
      {/* Single date selector — controls view + new entries */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {[{ l: 'Today', v: today }, { l: 'Yesterday', v: yesterday }].map((o) => (
          <button key={o.v} type="button" onClick={() => setDate(o.v)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold border ${
              date === o.v ? 'bg-money-in text-white border-money-in' : 'bg-white text-slate-500 border-slate-200'
            }`}>{o.l}</button>
        ))}
        <input type="date" max={today} value={date}
          onChange={(e) => setDate(e.target.value || today)}
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600" />
        {date !== today && <span className="text-[11px] text-amber-600 font-semibold">Back-dated</span>}
      </div>

      <QuickEntry scopeId={scopeId} entryDate={date} onSaved={() => load(true)} />

      {!loading && entries.length > 0 && (
        <div className="mb-3 rounded-2xl bg-green-50 border border-green-100 px-4 py-3">
          <p className="text-xs text-green-700 font-medium">Collected {label}</p>
          <p className="text-2xl font-bold text-money-in">₹{fmt(total)}</p>
        </div>
      )}

      {loading && <p className="text-slate-400 text-center py-8">Loading…</p>}
      {!loading && entries.length === 0 && (
        <p className="text-center text-slate-400 py-10">No entries for {label}</p>
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

// Quick entry — entryDate comes from the parent date selector.
function QuickEntry({ scopeId, entryDate, onSaved }) {
  const { session } = useSession()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [customer, setCustomer] = useState(null)
  const [loans, setLoans] = useState([])
  const [loanId, setLoanId] = useState('')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [allCustomers, setAllCustomers] = useState([])
  const nameRef = useRef(null)
  const amountRef = useRef(null)

  useEffect(() => { api.customers({ memberId: scopeId }).then(setAllCustomers).catch(() => {}) }, [scopeId])

  useEffect(() => {
    const q = search.trim().toLowerCase()
    if (customer || !q) { setResults([]); return }
    const matches = allCustomers.filter((c) => c.name.toLowerCase().includes(q))
    matches.sort((a, b) => {
      const as = a.name.toLowerCase().startsWith(q) ? 0 : 1
      const bs = b.name.toLowerCase().startsWith(q) ? 0 : 1
      return as - bs || a.name.localeCompare(b.name)
    })
    setResults(matches.slice(0, 8))
  }, [search, customer, allCustomers])

  const pick = async (c) => {
    setCustomer(c); setSearch(c.name); setResults([]); setLoanId('')
    try {
      const active = await api.loans(c.id, 'active')
      setLoans(active)
      if (active.length === 1) { setLoanId(active[0].id); setTimeout(() => amountRef.current?.focus(), 0) }
    } catch { setLoans([]) }
  }

  const reset = () => { setCustomer(null); setSearch(''); setResults([]); setAmount(''); setLoans([]); setLoanId('') }

  const save = async () => {
    if (saving) return
    setMsg(null)
    if (!customer) { setMsg('Pick a customer from the list'); return }
    if (loans.length === 0) { setMsg('This customer has no active loan'); return }
    if (!loanId) { setMsg('Choose which loan'); return }
    const amt = Number(amount)
    if (!amount || Number.isNaN(amt) || amt <= 0) { setMsg('Enter a valid amount'); return }
    setSaving(true)
    try {
      await api.createEntry({ loan_id: loanId, customer_id: customer.id, member_id: session.id, amount: amt, entry_date: entryDate })
      setMsg(`Saved ₹${fmt(amt)} for ${customer.name}`)
      reset()
      onSaved?.()
      setTimeout(() => nameRef.current?.focus(), 0)
    } catch (e) {
      setMsg(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card p-3 mb-3">
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
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save() } }}
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

      {customer && loans.length > 1 && (
        <div className="mt-2">
          <p className="text-xs font-medium text-slate-500 mb-1 px-1">Which loan?</p>
          <div className="flex flex-wrap gap-2">
            {loans.map((l, i) => {
              const bal = Number(l.total_to_receive) - Number(l.collected)
              return (
                <button key={l.id} type="button"
                  onClick={() => { setLoanId(l.id); setTimeout(() => amountRef.current?.focus(), 0) }}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold border ${
                    loanId === l.id ? 'bg-money-in text-white border-money-in' : 'bg-white text-slate-600 border-slate-200'
                  }`}>
                  Loan {i + 1} · bal ₹{fmt(bal)}
                </button>
              )
            })}
          </div>
        </div>
      )}
      {customer && loans.length === 0 && (
        <p className="text-xs text-amber-600 mt-2 px-1">No active loan for this customer.</p>
      )}

      <p className="text-[11px] text-slate-400 mt-1.5 px-1">Type a name, pick loan if asked, enter amount, press Enter.</p>
      {msg && <p className="text-xs mt-1 text-slate-500 px-1">{msg}</p>}
    </div>
  )
}
