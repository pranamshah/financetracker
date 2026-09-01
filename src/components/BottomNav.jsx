const ICONS = {
  entries: 'M4 6h16M4 12h16M4 18h10',
  customers: 'M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87m6-1.13a4 4 0 1 0-4-4 4 4 0 0 0 4 4z',
  new: 'M12 5v14M5 12h14',
  summary: 'M4 19V9m5 10V5m5 14v-7m5 7V11',
  members: 'M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 7.7l5.4-.8z'
}

export default function BottomNav({ tabs, tab, setTab }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-slate-200 safe-bottom z-20 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
      <div className="max-w-lg mx-auto grid px-1" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((t) => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex flex-col items-center gap-1 py-2 text-[11px] font-semibold"
            >
              <span className={`flex items-center justify-center h-8 w-14 rounded-full transition ${
                active ? 'bg-green-100 text-money-in' : 'text-slate-400'
              }`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth={active ? 2.4 : 2} strokeLinecap="round" strokeLinejoin="round">
                  <path d={ICONS[t.key]} />
                </svg>
              </span>
              <span className={active ? 'text-money-in' : 'text-slate-400'}>{t.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
