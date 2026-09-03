import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { fmt } from '../../lib/calc.js'
import { periodReportPdf, periodReportXlsx, allDataXlsx } from '../../lib/pdf.js'

const RANGES = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' }
]

export default function Summary({ scopeId, isAdmin }) {
  const [range, setRange] = useState('today')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.summary({ range, memberId: scopeId })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [range, scopeId])

  const downloadPdf = async () => {
    setDownloading(true)
    try {
      const rep = await api.report({ range, memberId: scopeId, group: 'day' })
      periodReportPdf(rep)
    } catch (e) {
      alert(e.message)
    } finally {
      setDownloading(false)
    }
  }

  const [downloadingXlsx, setDownloadingXlsx] = useState(false)
  const downloadXlsx = async () => {
    setDownloadingXlsx(true)
    try {
      const rep = await api.report({ range, memberId: scopeId, group: 'day' })
      periodReportXlsx(rep)
    } catch (e) {
      alert(e.message)
    } finally {
      setDownloadingXlsx(false)
    }
  }

  const [downloadingAll, setDownloadingAll] = useState(false)
  const downloadAll = async () => {
    setDownloadingAll(true)
    try {
      const rep = await api.report({ range: 'all', memberId: scopeId, group: 'day' })
      periodReportPdf(rep)
    } catch (e) {
      alert(e.message)
    } finally {
      setDownloadingAll(false)
    }
  }

  const [downloadingAllXlsx, setDownloadingAllXlsx] = useState(false)
  const downloadAllXlsx = async () => {
    setDownloadingAllXlsx(true)
    try {
      const data = await api.allData()
      allDataXlsx(data)
    } catch (e) {
      alert(e.message)
    } finally {
      setDownloadingAllXlsx(false)
    }
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold border ${
              range === r.key ? 'bg-money-in text-white border-money-in' : 'bg-white text-slate-500 border-slate-300'
            }`}
          >
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

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={downloadPdf}
              disabled={downloading}
              className="rounded-xl border border-money-in text-money-in font-semibold py-3 text-sm disabled:opacity-50"
            >
              {downloading ? 'Preparing…' : `📄 PDF`}
            </button>
            <button
              onClick={downloadXlsx}
              disabled={downloadingXlsx}
              className="rounded-xl border border-blue-500 text-blue-600 font-semibold py-3 text-sm disabled:opacity-50"
            >
              {downloadingXlsx ? 'Preparing…' : `📊 Excel`}
            </button>
          </div>
          <p className="text-xs text-slate-400 text-center -mt-1">{RANGES.find((r) => r.key === range)?.label} report</p>

          {isAdmin && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={downloadAll}
                disabled={downloadingAll}
                className="rounded-xl bg-slate-800 text-white font-semibold py-3 text-sm disabled:opacity-50"
              >
                {downloadingAll ? 'Preparing…' : '📄 All Data PDF'}
              </button>
              <button
                onClick={downloadAllXlsx}
                disabled={downloadingAllXlsx}
                className="rounded-xl bg-green-700 text-white font-semibold py-3 text-sm disabled:opacity-50"
              >
                {downloadingAllXlsx ? 'Preparing…' : '📊 All Data Excel'}
              </button>
            </div>
          )}
        </div>
      )}
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
