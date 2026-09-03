import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { fmt } from '../../lib/calc.js'
import { periodReportPdf, periodReportXlsx, allDataXlsx } from '../../lib/pdf.js'

const todayIST = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())

const RANGES = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' }
]

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MON_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function fmtDate(str) {
  // str = 'YYYY-MM-DD'
  const [y, m, d] = str.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return `${DAY_NAMES[dt.getUTCDay()]}, ${d} ${MON_NAMES[m - 1]}`
}

// Build day-totals map from report rows
function dayTotals(rows) {
  const map = {}
  for (const r of rows) {
    const key = String(r.entry_date).slice(0, 10)
    map[key] = (map[key] || 0) + Number(r.amount)
  }
  return map
}

// Week number within month (Mon-start)
function weekOfMonth(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const first = new Date(Date.UTC(y, m - 1, 1))
  const firstMon = first.getUTCDay() === 0 ? 1 : 8 - first.getUTCDay()
  if (d < firstMon) return 1
  return Math.floor((d - firstMon) / 7) + 2
}

export default function Summary({ scopeId, isAdmin }) {
  const [range, setRange] = useState('today')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Breakdown (day-wise rows) for week/month
  const [breakdown, setBreakdown] = useState(null)
  const [breakLoading, setBreakLoading] = useState(false)
  // month view toggle: 'day' or 'week'
  const [monthView, setMonthView] = useState('day')

  const today = todayIST()
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)
  const [showCustom, setShowCustom] = useState(false)

  useEffect(() => {
    setLoading(true)
    setBreakdown(null)
    api.summary({ range, memberId: scopeId })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [range, scopeId])

  // Fetch breakdown rows when on week or month
  useEffect(() => {
    if (range === 'today') { setBreakdown(null); return }
    setBreakLoading(true)
    api.report({ range, memberId: scopeId, group: 'day' })
      .then((rep) => setBreakdown(rep.rows))
      .catch(() => setBreakdown([]))
      .finally(() => setBreakLoading(false))
  }, [range, scopeId])

  // ---- Download helpers ----
  const [dl, setDl] = useState({})
  const withDl = (key, fn) => async () => {
    setDl((d) => ({ ...d, [key]: true }))
    try { await fn() } catch (e) { alert(e.message) }
    finally { setDl((d) => ({ ...d, [key]: false })) }
  }
  const fetchReport = (r, from, to) =>
    api.report({ range: r, memberId: scopeId, group: 'day', from, to })

  const downloadPdf   = withDl('pdf',   async () => periodReportPdf(await fetchReport(range)))
  const downloadXlsx  = withDl('xlsx',  async () => periodReportXlsx(await fetchReport(range)))
  const downloadMonthPdf  = withDl('mpdf',  async () => { const r = await fetchReport('month'); periodReportPdf({ ...r, range: 'month' }) })
  const downloadMonthXlsx = withDl('mxlsx', async () => { const r = await fetchReport('month'); periodReportXlsx({ ...r, range: 'month' }) })
  const downloadCustomPdf  = withDl('cpdf',  async () => { const r = await fetchReport('custom', fromDate, toDate); periodReportPdf({ ...r, range: `${fromDate} to ${toDate}` }) })
  const downloadCustomXlsx = withDl('cxlsx', async () => { const r = await fetchReport('custom', fromDate, toDate); periodReportXlsx({ ...r, range: `${fromDate} to ${toDate}` }) })
  const downloadAllPdf  = withDl('apdf',  async () => { const r = await fetchReport('all'); periodReportPdf({ ...r, range: 'all' }) })
  const downloadAllXlsx = withDl('axlsx', async () => allDataXlsx(await api.allData()))

  return (
    <div>
      {/* Range tabs */}
      <div className="flex gap-2 mb-4">
        {RANGES.map((r) => (
          <button key={r.key} onClick={() => setRange(r.key)}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold border ${
              range === r.key ? 'bg-money-in text-white border-money-in' : 'bg-white text-slate-500 border-slate-300'
            }`}>
            {r.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-center text-slate-400 py-8">Loading…</p>}

      {data && !loading && (
        <div className="space-y-3">
          {/* Stat tiles */}
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Collected (in)" value={`₹${fmt(data.collected)}`} tone="in" />
            <Stat label="Given (out)" value={`₹${fmt(data.given)}`} tone="out" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Entries" value={data.entry_count} tone="plain" />
            <Stat label="New customers" value={data.new_customers} tone="plain" />
          </div>

          {/* ---- Week breakdown ---- */}
          {range === 'week' && (
            <WeekBreakdown rows={breakdown} loading={breakLoading} today={today} />
          )}

          {/* ---- Month breakdown ---- */}
          {range === 'month' && (
            <MonthBreakdown
              rows={breakdown} loading={breakLoading}
              today={today} view={monthView} setView={setMonthView}
            />
          )}

          {/* Downloads for current range */}
          <SectionLabel label={`${RANGES.find((r) => r.key === range)?.label} Report`} />
          <DlRow
            pdfLabel={dl.pdf ? 'Preparing…' : '📄 PDF'} xlsxLabel={dl.xlsx ? 'Preparing…' : '📊 Excel'}
            onPdf={downloadPdf} onXlsx={downloadXlsx} pdfDis={dl.pdf} xlsxDis={dl.xlsx}
          />

          {/* This Month downloads (only when not already on month tab) */}
          {range !== 'month' && (
            <>
              <SectionLabel label="This Month" />
              <DlRow
                pdfLabel={dl.mpdf ? 'Preparing…' : '📄 PDF'} xlsxLabel={dl.mxlsx ? 'Preparing…' : '📊 Excel'}
                onPdf={downloadMonthPdf} onXlsx={downloadMonthXlsx} pdfDis={dl.mpdf} xlsxDis={dl.mxlsx}
              />
            </>
          )}

          {/* Custom date range */}
          <div className="rounded-2xl border border-slate-200 p-3 space-y-2">
            <button onClick={() => setShowCustom((v) => !v)}
              className="w-full flex items-center justify-between text-sm font-semibold text-slate-600">
              <span>Custom Date Range</span>
              <span className="text-slate-400">{showCustom ? '▲' : '▼'}</span>
            </button>
            {showCustom && (
              <>
                <div className="flex gap-2 items-center flex-wrap">
                  <label className="text-xs text-slate-500">From</label>
                  <input type="date" max={today} value={fromDate} onChange={(e) => setFromDate(e.target.value || today)}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs" />
                  <label className="text-xs text-slate-500">To</label>
                  <input type="date" max={today} value={toDate} onChange={(e) => setToDate(e.target.value || today)}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs" />
                </div>
                <DlRow
                  pdfLabel={dl.cpdf ? 'Preparing…' : '📄 PDF'} xlsxLabel={dl.cxlsx ? 'Preparing…' : '📊 Excel'}
                  onPdf={downloadCustomPdf} onXlsx={downloadCustomXlsx} pdfDis={dl.cpdf} xlsxDis={dl.cxlsx}
                />
              </>
            )}
          </div>

          {/* All data — admin only */}
          {isAdmin && (
            <>
              <SectionLabel label="All Data (Full Backup)" />
              <DlRow
                pdfLabel={dl.apdf ? 'Preparing…' : '📄 PDF'} xlsxLabel={dl.axlsx ? 'Preparing…' : '📊 Excel (3 sheets)'}
                onPdf={downloadAllPdf} onXlsx={downloadAllXlsx} pdfDis={dl.apdf} xlsxDis={dl.axlsx}
                pdfClass="bg-slate-800 text-white border-slate-800"
                xlsxClass="bg-green-700 text-white border-green-700"
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ---- Week breakdown: Mon–Sun, each day's total ----
function WeekBreakdown({ rows, loading, today }) {
  if (loading) return <p className="text-xs text-slate-400 text-center py-2">Loading breakdown…</p>
  if (!rows) return null

  const totals = dayTotals(rows)

  // Build Mon–Sun of the current week
  const [y, m, d] = today.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const dow = dt.getUTCDay() // 0=Sun
  const monOffset = dow === 0 ? -6 : 1 - dow
  const days = []
  for (let i = 0; i < 7; i++) {
    const dd = new Date(Date.UTC(y, m - 1, d + monOffset + i))
    const key = dd.toISOString().slice(0, 10)
    days.push({ key, isToday: key === today, isFuture: key > today })
  }

  return (
    <div className="rounded-2xl border border-slate-100 overflow-hidden">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-3 pt-2 pb-1">Day-wise this week</p>
      {days.map((day) => (
        <div key={day.key}
          className={`flex justify-between items-center px-3 py-2 border-t border-slate-100 ${day.isToday ? 'bg-green-50' : ''}`}>
          <span className={`text-sm ${day.isToday ? 'font-bold text-money-in' : day.isFuture ? 'text-slate-300' : 'text-slate-600'}`}>
            {fmtDate(day.key)}{day.isToday ? ' · Today' : ''}
          </span>
          <span className={`text-sm font-bold ${day.isFuture ? 'text-slate-300' : totals[day.key] ? 'text-money-in' : 'text-slate-300'}`}>
            {day.isFuture ? '—' : totals[day.key] ? `₹${fmt(totals[day.key])}` : '₹0'}
          </span>
        </div>
      ))}
    </div>
  )
}

// ---- Month breakdown: toggle between day-wise and week-wise ----
function MonthBreakdown({ rows, loading, today, view, setView }) {
  if (loading) return <p className="text-xs text-slate-400 text-center py-2">Loading breakdown…</p>
  if (!rows) return null

  const totals = dayTotals(rows)
  const [y, m] = today.split('-').map(Number)
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()

  // Build all days of the current month up to today
  const allDays = []
  for (let i = 1; i <= daysInMonth; i++) {
    const key = `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    allDays.push({ key, isFuture: key > today, isToday: key === today })
  }

  // Week-wise grouping
  const weeks = {}
  for (const day of allDays) {
    const wk = weekOfMonth(day.key)
    if (!weeks[wk]) weeks[wk] = []
    weeks[wk].push(day)
  }

  return (
    <div className="rounded-2xl border border-slate-100 overflow-hidden">
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
          {MON_NAMES[m - 1]} {y}
        </p>
        <div className="flex gap-1">
          {['day', 'week'].map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`text-xs px-2 py-0.5 rounded-lg font-semibold border ${
                view === v ? 'bg-money-in text-white border-money-in' : 'text-slate-400 border-slate-200'
              }`}>{v === 'day' ? 'Day' : 'Week'}</button>
          ))}
        </div>
      </div>

      {view === 'day' && allDays.map((day) => (
        <div key={day.key}
          className={`flex justify-between items-center px-3 py-2 border-t border-slate-100 ${day.isToday ? 'bg-green-50' : ''}`}>
          <span className={`text-sm ${day.isToday ? 'font-bold text-money-in' : day.isFuture ? 'text-slate-300' : 'text-slate-600'}`}>
            {fmtDate(day.key)}{day.isToday ? ' · Today' : ''}
          </span>
          <span className={`text-sm font-bold ${day.isFuture ? 'text-slate-300' : totals[day.key] ? 'text-money-in' : 'text-slate-300'}`}>
            {day.isFuture ? '—' : totals[day.key] ? `₹${fmt(totals[day.key])}` : '₹0'}
          </span>
        </div>
      ))}

      {view === 'week' && Object.entries(weeks).map(([wk, days]) => {
        const weekTotal = days.reduce((s, d) => s + (totals[d.key] || 0), 0)
        const allFuture = days.every((d) => d.isFuture)
        const start = fmtDate(days[0].key)
        const end = fmtDate(days[days.length - 1].key)
        return (
          <div key={wk} className="border-t border-slate-100">
            <div className="flex justify-between items-center px-3 py-2 bg-slate-50">
              <span className="text-xs font-semibold text-slate-500">Week {wk} · {start} – {end}</span>
              <span className={`text-sm font-bold ${allFuture ? 'text-slate-300' : weekTotal ? 'text-money-in' : 'text-slate-400'}`}>
                {allFuture ? '—' : `₹${fmt(weekTotal)}`}
              </span>
            </div>
            {days.map((day) => (
              <div key={day.key}
                className={`flex justify-between items-center px-5 py-1.5 border-t border-slate-50 ${day.isToday ? 'bg-green-50' : ''}`}>
                <span className={`text-xs ${day.isToday ? 'font-bold text-money-in' : day.isFuture ? 'text-slate-300' : 'text-slate-500'}`}>
                  {fmtDate(day.key)}{day.isToday ? ' · Today' : ''}
                </span>
                <span className={`text-xs font-semibold ${day.isFuture ? 'text-slate-300' : totals[day.key] ? 'text-money-in' : 'text-slate-300'}`}>
                  {day.isFuture ? '—' : totals[day.key] ? `₹${fmt(totals[day.key])}` : '₹0'}
                </span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function SectionLabel({ label }) {
  return <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1">{label}</p>
}

function DlRow({ pdfLabel, xlsxLabel, onPdf, onXlsx, pdfDis, xlsxDis,
  pdfClass = 'border border-money-in text-money-in',
  xlsxClass = 'border border-blue-500 text-blue-600' }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button onClick={onPdf} disabled={pdfDis}
        className={`rounded-xl font-semibold py-3 text-sm disabled:opacity-50 ${pdfClass}`}>{pdfLabel}</button>
      <button onClick={onXlsx} disabled={xlsxDis}
        className={`rounded-xl font-semibold py-3 text-sm disabled:opacity-50 ${xlsxClass}`}>{xlsxLabel}</button>
    </div>
  )
}

function Stat({ label, value, tone }) {
  const color = tone === 'in' ? 'text-money-in' : tone === 'out' ? 'text-money-out' : 'text-slate-800'
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
