import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { fmt } from '../lib/calc.js'
import { useSession } from '../context/SessionContext.jsx'
import LoanForm from '../components/LoanForm.jsx'

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showLoan, setShowLoan] = useState(false)

  const load = () => {
    setLoading(true)
    api.customer(id)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }
  useEffect(load, [id])

  if (loading) return <p className="text-center text-slate-400 py-16">Loading…</p>
  if (!data || data.error) return <p className="text-center text-slate-400 py-16">Customer not found</p>

  const { customer, loans, entries } = data
  const totalToReceive = loans.reduce((s, l) => s + Number(l.total_to_receive), 0)
  const totalCollected = loans.reduce((s, l) => s + Number(l.collected), 0)
  const balance = totalToReceive - totalCollected

  return (
    <div className="min-h-screen max-w-lg mx-auto pb-10 bg-white sm:shadow-xl sm:border-x sm:border-slate-200">
      <header className="safe-top sticky top-0 bg-white/90 backdrop-blur border-b border-slate-100 z-10">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-slate-500 text-xl">‹</button>
          <h1 className="font-bold text-lg flex-1 truncate">{customer.name}</h1>
          <button
            onClick={async () => { const { customerHistoryPdf } = await import('../lib/pdf.js'); customerHistoryPdf(data) }}
            className="text-xs font-semibold text-money-in border border-money-in rounded-lg px-2.5 py-1.5"
          >
            PDF
          </button>
        </div>
      </header>

      <div className="px-4 py-4 space-y-5">
        {/* Basic info */}
        <div className="card p-4 space-y-1 text-sm">
          {customer.phone && <p><span className="text-slate-400">Phone: </span>{customer.phone}</p>}
          {customer.address && <p><span className="text-slate-400">Address: </span>{customer.address}</p>}
          {!customer.phone && !customer.address && <p className="text-slate-400">No contact details</p>}
        </div>

        {/* Balance */}
        <div className="grid grid-cols-3 gap-2">
          <Mini label="To receive" value={`₹${fmt(totalToReceive)}`} />
          <Mini label="Collected" value={`₹${fmt(totalCollected)}`} tone="in" />
          <Mini label="Balance" value={`₹${fmt(balance)}`} tone="out" />
        </div>

        {/* Loans — each with its own collection history */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-slate-700">Loans & History</h2>
            <button onClick={() => setShowLoan(true)} className="text-sm font-semibold text-money-out">+ Add Loan</button>
          </div>
          {loans.length === 0 && <p className="text-slate-400 text-sm">No loans yet</p>}
          <div className="space-y-4">
            {loans.map((l, i) => (
              <LoanBlock key={l.id} loan={l} index={i + 1}
                entries={entries.filter((e) => e.loan_id === l.id)}
                customer={customer} onChanged={load} />
            ))}
          </div>
        </div>
      </div>

      {showLoan && (
        <div className="fixed inset-0 z-30 bg-black/40 flex items-end sm:items-center justify-center" onClick={() => setShowLoan(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 safe-bottom max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Add Loan</h2>
              <button onClick={() => setShowLoan(false)} className="text-slate-400 text-2xl leading-none">×</button>
            </div>
            <LoanForm
              customerId={customer.id}
              onSaved={() => { setShowLoan(false); load() }}
              onCancel={() => setShowLoan(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function overdueDays(loan) {
  if (loan.status !== 'active' || !loan.start_date) return 0
  const due = new Date(loan.start_date)
  due.setDate(due.getDate() + Number(loan.tenure_days || 0))
  const diff = Math.floor((Date.now() - due.getTime()) / 86400000)
  return diff > 0 ? diff : 0
}

function LoanBlock({ loan, index, entries, customer, onChanged }) {
  const { isAdmin } = useSession()
  const [busyId, setBusyId] = useState(null)
  const collected = Number(loan.collected)

  const removeEntry = async (e) => {
    if (!window.confirm(`Delete this entry of ₹${fmt(e.amount)}? This cannot be undone.`)) return
    setBusyId(e.id)
    try { await api.deleteEntry(e.id); onChanged?.() }
    catch (err) { alert(err.message) }
    finally { setBusyId(null) }
  }

  const pending = Number(loan.total_to_receive) - collected
  const over = overdueDays(loan)

  const downloadLoan = async () => {
    const { loanHistoryPdf } = await import('../lib/pdf.js')
    loanHistoryPdf({ customer, loan, entries, index })
  }

  return (
    <div className="card p-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-semibold">Loan {index} · ₹{fmt(loan.amount_given)} <span className="text-slate-400 font-normal">given</span></p>
          <p className="text-xs text-slate-400">
            +₹{fmt(loan.interest_amount)} interest · {loan.frequency} · {loan.installment_count}×₹{fmt(loan.installment_amount)}
          </p>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${loan.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
          {loan.status}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        <Mini label="Paid" value={`₹${fmt(collected)}`} tone="in" />
        <Mini label="Pending" value={`₹${fmt(pending)}`} tone="out" />
        <Mini label="Total" value={`₹${fmt(loan.total_to_receive)}`} />
      </div>

      {over > 0 && (
        <p className="mt-2 text-xs font-semibold text-red-600 bg-red-50 rounded-lg px-2 py-1 inline-block">
          {over} {over === 1 ? 'day' : 'days'} overdue
        </p>
      )}

      <div className="flex items-center justify-between mt-3 mb-1">
        <p className="text-xs font-semibold text-slate-500">Collection history</p>
        <button onClick={downloadLoan} className="text-xs font-semibold text-money-in border border-money-in rounded-lg px-2 py-1">
          PDF
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-slate-400">No collections yet</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {entries.map((e) => (
            <li key={e.id} className="flex justify-between items-center py-2 gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{new Date(e.entry_date).toLocaleDateString()}</p>
                <p className="text-xs text-slate-400 truncate">{e.member_name || ''}{e.note ? ` · ${e.note}` : ''}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
                <span className="font-bold text-money-in">+₹{fmt(e.amount)}</span>
                {isAdmin && (
                  <button onClick={() => removeEntry(e)} disabled={busyId === e.id}
                    aria-label="Delete entry"
                    className="text-slate-300 hover:text-red-500 disabled:opacity-40 text-lg leading-none px-1">×</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Mini({ label, value, tone }) {
  const color = tone === 'in' ? 'text-money-in' : tone === 'out' ? 'text-money-out' : 'text-slate-800'
  return (
    <div className="card p-3 text-center">
      <p className="text-[10px] font-medium text-slate-400">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  )
}
