import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { fmt } from '../../lib/calc.js'

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
      const { periodReportPdf } = await import('../../lib/pdf.js')
      periodReportPdf(rep)
    } catch (e) {
      alert(e.message)
    } finally {
      setDownloading(false)
    }
  }

  const [downloadingAll, setDownloadingAll] = useState(false)
  const downloadAll = async () => {
    setDownloadingAll(true)
    try {
      const data = await api.allData()
      const { allDataPdf } = await import('../../lib/pdf.js')
      allDataPdf(data)
    } catch (e) {
      alert(e.message)
    } finally {
      setDownloadingAll(false)
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
          <div className={`rounded-xl p-4 border ${data.net >= 0 ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-100'}`}>
            <p className="text-xs font-medium text-slate-500">Net</p>
            <p className={`text-2xl font-bold ${data.net >= 0 ? 'text-money-in' : 'text-money-out'}`}>
              ₹{fmt(data.net)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Entries" value={data.entry_count} tone="plain" />
            <Stat label="New customers" value={data.new_customers} tone="plain" />
          </div>

          <button
            onClick={downloadPdf}
            disabled={downloading}
            className="w-full rounded-xl border border-money-in text-money-in font-semibold py-3 disabled:opacity-50"
          >
            {downloading ? 'Preparing…' : `Download ${RANGES.find((r) => r.key === range).label} PDF (day-wise)`}
          </button>

          {isAdmin && (
            <button
              onClick={downloadAll}
              disabled={downloadingAll}
              className="w-full rounded-xl bg-slate-800 text-white font-semibold py-3 disabled:opacity-50"
            >
              {downloadingAll ? 'Preparing…' : 'Download ALL data (backup PDF)'}
            </button>
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
