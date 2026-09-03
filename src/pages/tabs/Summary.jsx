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

export default function Summary({ scopeId, isAdmin }) {
  const [range, setRange] = useState('today')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Custom date range state
  const today = todayIST()
  const [fromDate, setFromDate] = useState(today)
  const [toDate, setToDate] = useState(today)
  const [showCustom, setShowCustom] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.summary({ range, memberId: scopeId })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [range, scopeId])

  // ---- Download helpers ----
  const [dl, setDl] = useState({}) // { key: true } while downloading

  const withDl = (key, fn) => async () => {
    setDl((d) => ({ ...d, [key]: true }))
    try { await fn() } catch (e) { alert(e.message) }
    finally { setDl((d) => ({ ...d, [key]: false })) }
  }

  const fetchReport = (r, from, to) =>
    api.report({ range: r, memberId: scopeId, group: 'day', from, to })

  const downloadPdf = withDl('pdf', async () => {
    const rep = await fetchReport(range)
    periodReportPdf(rep)
  })

  const downloadXlsx = withDl('xlsx', async () => {
    const rep = await fetchReport(range)
    periodReportXlsx(rep)
  })

  const downloadMonthPdf = withDl('mpdf', async () => {
    const rep = await fetchReport('month')
    periodReportPdf({ ...rep, range: 'month' })
  })

  const downloadMonthXlsx = withDl('mxlsx', async () => {
    const rep = await fetchReport('month')
    periodReportXlsx({ ...rep, range: 'month' })
  })

  const downloadCustomPdf = withDl('cpdf', async () => {
    const rep = await fetchReport('custom', fromDate, toDate)
    periodReportPdf({ ...rep, range: `${fromDate} to ${toDate}` })
  })

  const downloadCustomXlsx = withDl('cxlsx', async () => {
    const rep = await fetchReport('custom', fromDate, toDate)
    periodReportXlsx({ ...rep, range: `${fromDate} to ${toDate}` })
  })

  const downloadAllPdf = withDl('apdf', async () => {
    const rep = await fetchReport('all')
    periodReportPdf({ ...rep, range: 'all' })
  })

  const downloadAllXlsx = withDl('axlsx', async () => {
    const data = await api.allData()
    allDataXlsx(data)
  })

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
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Collected (in)" value={`₹${fmt(data.collected)}`} tone="in" />
            <Stat label="Given (out)" value={`₹${fmt(data.given)}`} tone="out" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Entries" value={data.entry_count} tone="plain" />
            <Stat label="New customers" value={data.new_customers} tone="plain" />
          </div>

          {/* Current period download */}
          <SectionLabel label={`${RANGES.find((r) => r.key === range)?.label} Report`} />
          <DlRow
            pdfLabel={dl.pdf ? 'Preparing…' : '📄 PDF'}
            xlsxLabel={dl.xlsx ? 'Preparing…' : '📊 Excel'}
            onPdf={downloadPdf} onXlsx={downloadXlsx}
            pdfDis={dl.pdf} xlsxDis={dl.xlsx}
          />

          {/* This month — always available regardless of tab */}
          {range !== 'month' && (
            <>
              <SectionLabel label="This Month" />
              <DlRow
                pdfLabel={dl.mpdf ? 'Preparing…' : '📄 PDF'}
                xlsxLabel={dl.mxlsx ? 'Preparing…' : '📊 Excel'}
                onPdf={downloadMonthPdf} onXlsx={downloadMonthXlsx}
                pdfDis={dl.mpdf} xlsxDis={dl.mxlsx}
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
                  <input type="date" max={today} value={fromDate}
                    onChange={(e) => setFromDate(e.target.value || today)}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs" />
                  <label className="text-xs text-slate-500">To</label>
                  <input type="date" max={today} value={toDate}
                    onChange={(e) => setToDate(e.target.value || today)}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs" />
                </div>
                <DlRow
                  pdfLabel={dl.cpdf ? 'Preparing…' : '📄 PDF'}
                  xlsxLabel={dl.cxlsx ? 'Preparing…' : '📊 Excel'}
                  onPdf={downloadCustomPdf} onXlsx={downloadCustomXlsx}
                  pdfDis={dl.cpdf} xlsxDis={dl.cxlsx}
                />
              </>
            )}
          </div>

          {/* All data — admin only */}
          {isAdmin && (
            <>
              <SectionLabel label="All Data (Full Backup)" />
              <DlRow
                pdfLabel={dl.apdf ? 'Preparing…' : '📄 PDF (Day-wise)'}
                xlsxLabel={dl.axlsx ? 'Preparing…' : '📊 Excel (3 sheets)'}
                onPdf={downloadAllPdf} onXlsx={downloadAllXlsx}
                pdfDis={dl.apdf} xlsxDis={dl.axlsx}
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

function SectionLabel({ label }) {
  return <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1">{label}</p>
}

function DlRow({ pdfLabel, xlsxLabel, onPdf, onXlsx, pdfDis, xlsxDis,
  pdfClass = 'border border-money-in text-money-in',
  xlsxClass = 'border border-blue-500 text-blue-600' }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button onClick={onPdf} disabled={pdfDis}
        className={`rounded-xl font-semibold py-3 text-sm disabled:opacity-50 ${pdfClass}`}>
        {pdfLabel}
      </button>
      <button onClick={onXlsx} disabled={xlsxDis}
        className={`rounded-xl font-semibold py-3 text-sm disabled:opacity-50 ${xlsxClass}`}>
        {xlsxLabel}
      </button>
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
