import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../context/SessionContext.jsx'
import { api } from '../lib/api.js'
import BottomNav from '../components/BottomNav.jsx'
import MemberFilter from '../components/MemberFilter.jsx'
import DailyEntries from './tabs/DailyEntries.jsx'
import Customers from './tabs/Customers.jsx'
import NewTab from './tabs/NewTab.jsx'
import Summary from './tabs/Summary.jsx'
import Members from './tabs/Members.jsx'

// Non-admins get 4 tabs; admin gets an extra "People" overview.
const STAFF_TABS = [
  { key: 'entries', label: 'Entries' },
  { key: 'customers', label: 'Customers' },
  { key: 'new', label: 'New' },
  { key: 'summary', label: 'Summary' }
]
const ADMIN_TABS = [
  { key: 'members', label: 'People' },
  ...STAFF_TABS
]

export default function Dashboard() {
  const { session, logout, isAdmin } = useSession()
  const navigate = useNavigate()
  const [tab, setTab] = useState(isAdmin ? 'members' : 'entries')
  const [members, setMembers] = useState([])
  // Admin filter: null = All / everyone. For non-admins it's forced to their own id.
  const [filter, setFilter] = useState(null)

  useEffect(() => {
    if (isAdmin) api.members().then(setMembers).catch(() => {})
  }, [isAdmin])

  // Non-admins are always scoped to themselves; admin uses the dropdown / People tab.
  const scopeId = isAdmin ? filter : session.id
  const tabs = isAdmin ? ADMIN_TABS : STAFF_TABS

  const switchUser = () => { logout(); navigate('/') }

  // From the People overview: focus one member and jump into their entries.
  const openMember = (m) => { setFilter(m.id); setTab('entries') }

  const filterName = filter ? members.find((m) => m.id === filter)?.name : null
  const titles = {
    members: 'People', entries: 'Daily Entries', customers: 'Customers', new: 'New', summary: 'Summary'
  }

  return (
    <div className="min-h-full pb-20 max-w-lg mx-auto">
      <header className="safe-top sticky top-0 bg-white/90 backdrop-blur border-b border-slate-100 z-10">
        <div className="px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-white font-bold ${isAdmin ? 'bg-amber-500' : 'bg-money-in'}`}>
              {session.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-lg leading-tight truncate">{titles[tab]}</h1>
              <p className="text-xs text-slate-400 truncate">
                {session.name}{isAdmin ? ' · Admin' : ''}
                {isAdmin && filterName ? ` · viewing ${filterName}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && tab !== 'new' && tab !== 'members' && (
              <MemberFilter members={members} value={filter} onChange={setFilter} />
            )}
            <button
              onClick={switchUser}
              className="text-xs font-semibold text-slate-500 border border-slate-200 rounded-lg px-2.5 py-1.5 active:bg-slate-50"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 animate-in">
        {tab === 'members' && isAdmin && <Members onOpenMember={openMember} />}
        {tab === 'entries' && <DailyEntries scopeId={scopeId} />}
        {tab === 'customers' && <Customers scopeId={scopeId} isAdmin={isAdmin} />}
        {tab === 'new' && <NewTab onDone={() => setTab('customers')} />}
        {tab === 'summary' && <Summary scopeId={scopeId} isAdmin={isAdmin} />}
      </main>

      <BottomNav tabs={tabs} tab={tab} setTab={setTab} />
    </div>
  )
}
