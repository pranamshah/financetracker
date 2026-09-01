const TABS = [
  { key: 'entries', label: 'Entries', icon: 'M4 6h16M4 12h16M4 18h10' },
  { key: 'customers', label: 'Customers', icon: 'M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87m6-1.13a4 4 0 1 0-4-4 4 4 0 0 0 4 4z' },
  { key: 'new', label: 'New', icon: 'M12 5v14M5 12h14' },
  { key: 'summary', label: 'Summary', icon: 'M4 19V9m5 10V5m5 14v-7m5 7V11' }
]

export default function BottomNav({ tab, setTab }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 safe-bottom z-20">
      <div className="max-w-lg mx-auto grid grid-cols-4">
        {TABS.map((t) => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-col items-center gap-1 py-2.5 text-xs font-medium ${
                active ? 'text-money-in' : 'text-slate-400'
              }`}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={t.icon} />
              </svg>
              {t.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
