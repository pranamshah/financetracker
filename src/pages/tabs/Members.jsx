import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { fmt } from '../../lib/calc.js'
import { useAutoRefresh } from '../../lib/useAutoRefresh.js'

// Admin-only overview: every member with their own numbers. Tapping one drills
// into that member's data (sets the filter and jumps to their entries).
export default function Members({ onOpenMember }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => api.memberStats().then(setRows).catch(() => setRows([])).finally(() => setLoading(false))
  useEffect(() => { load() }, [])
  useAutoRefresh(load, { intervalMs: 20000 })

  if (loading) return <p className="text-center text-slate-400 py-10">Loading…</p>

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">Tap a person to see only their customers and entries.</p>
      {rows.map((m) => (
        <button
          key={m.id}
          onClick={() => onOpenMember(m)}
          className="w-full text-left card p-4 flex items-center gap-3 active:scale-[0.99] transition"
        >
          <div className={`h-11 w-11 shrink-0 rounded-full flex items-center justify-center text-white font-bold ${m.role === 'admin' ? 'bg-amber-500' : 'bg-money-in'}`}>
            {m.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 truncate">
              {m.name}{m.role === 'admin' && <span className="ml-1 text-[10px] font-bold uppercase text-amber-600">Admin</span>}
            </p>
            <p className="text-xs text-slate-400">{m.customers} customers</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-money-in">₹{fmt(m.today_collected)}</p>
            <p className="text-xs text-slate-400">{m.today_entries} today</p>
          </div>
        </button>
      ))}
    </div>
  )
}
