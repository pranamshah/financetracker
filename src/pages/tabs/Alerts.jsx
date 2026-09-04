import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { fmt } from '../../lib/calc.js'

const todayIST = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())

function dateShiftIST(n) {
  const t = todayIST()
  const [y, m, d] = t.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() - n)
  return dt.toISOString().slice(0, 10)
}

export default function Alerts({ scopeId }) {
  const today = todayIST()
  const yesterday = dateShiftIST(1)
  const [date, setDate] = useState(today)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.alerts({ date, memberId: scopeId })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [date, scopeId])

  const label = date === today ? 'today' : date === yesterday ? 'yesterday' : date
  const rows = data?.rows || []

  return (
    <div>
      {/* Date selector */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {[{ l: 'Today', v: today }, { l: 'Yesterday', v: yesterday }].map((o) => (
          <button key={o.v} type="button" onClick={() => setDate(o.v)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold border ${
              date === o.v ? 'bg-red-500 text-white border-red-500' : 'bg-white text-slate-500 border-slate-200'
            }`}>{o.l}</button>
        ))}
        <input type="date" max={today} value={date}
          onChange={(e) => setDate(e.target.value || today)}
          className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600" />
      </div>

      {/* Count badge */}
      {!loading && (
        <div className={`mb-3 rounded-2xl px-4 py-3 border ${
          rows.length === 0
            ? 'bg-green-50 border-green-100'
            : 'bg-red-50 border-red-100'
        }`}>
          {rows.length === 0 ? (
            <>
              <p className="text-xs text-green-700 font-medium">All paid {label}</p>
              <p className="text-lg font-bold text-green-600">Everyone has paid</p>
            </>
          ) : (
            <>
              <p className="text-xs text-red-600 font-medium">Unpaid {label}</p>
              <p className="text-2xl font-bold text-red-500">{rows.length} customer{rows.length !== 1 ? 's' : ''} haven't paid</p>
            </>
          )}
        </div>
      )}

      {loading && <p className="text-slate-400 text-center py-8">Loading…</p>}

      {!loading && rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((c) => {
            const balance = Number(c.total_to_receive) - Number(c.total_collected)
            return (
              <li key={c.id} className="card px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{c.name}</p>
                    <p className="text-xs text-slate-400 truncate">
                      {c.phone || 'No phone'}
                      {Number(c.active_loans) > 1 ? ` · ${c.active_loans} active loans` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-400">Balance</p>
                    <p className="font-bold text-red-500 whitespace-nowrap">₹{fmt(balance)}</p>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
