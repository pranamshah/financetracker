import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { fmt } from '../../lib/calc.js'
import { useAutoRefresh } from '../../lib/useAutoRefresh.js'

export default function Customers({ scopeId, isAdmin }) {
  const [all, setAll] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // scopeId null = admin "All" (every customer); otherwise only this person's own.
  const load = () =>
    api.customers({ memberId: scopeId }).then(setAll).catch(() => setAll([])).finally(() => setLoading(false))

  useEffect(() => { load() }, [scopeId])
  // Refresh the customer list when returning to the tab (new customers added elsewhere).
  useAutoRefresh(load, { intervalMs: 0 })

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return term ? all.filter((c) => c.name.toLowerCase().includes(term)) : all
  }, [all, search])

  // Group A-Z (contacts-app style).
  const groups = useMemo(() => {
    const map = {}
    for (const c of filtered) {
      const letter = (c.name[0] || '#').toUpperCase()
      const key = /[A-Z]/.test(letter) ? letter : '#'
      ;(map[key] ||= []).push(c)
    }
    return Object.keys(map).sort().map((k) => [k, map[k]])
  }, [filtered])

  return (
    <div>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search customers"
        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none mb-4"
      />

      {loading && <p className="text-center text-slate-400 py-8">Loading…</p>}
      {!loading && filtered.length === 0 && (
        <p className="text-center text-slate-400 py-16">No customers yet</p>
      )}

      {groups.map(([letter, list]) => (
        <div key={letter} className="mb-4">
          <p className="text-xs font-bold text-slate-400 px-1 mb-1">{letter}</p>
          <ul className="space-y-2">
            {list.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => navigate(`/customer/${c.id}`)}
                  className="w-full text-left card px-4 py-3 flex items-center justify-between gap-3 active:scale-[0.99] transition"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{c.name}</p>
                    <p className="text-xs text-slate-400 truncate">
                      Given ₹{fmt(c.total_given)}
                      {c.phone ? ` · ${c.phone}` : ''}
                      {isAdmin && c.added_by_name ? ` · by ${c.added_by_name}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0 whitespace-nowrap">
                    <p className="text-xs text-slate-400">Balance</p>
                    <p className="font-bold text-money-out">₹{fmt(Number(c.total_to_receive) - Number(c.collected))}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
