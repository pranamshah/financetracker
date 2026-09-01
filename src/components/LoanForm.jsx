import { useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import { computeLoan, fmt } from '../lib/calc.js'
import { useSession } from '../context/SessionContext.jsx'

// Reusable loan-creation form with live calculation.
// Used by the New tab (after creating a customer) and Customer Detail ("Add Loan").
export default function LoanForm({ customerId, onSaved, onCancel }) {
  const { session } = useSession()
  const [amountGiven, setAmountGiven] = useState('')
  const [interestAmount, setInterestAmount] = useState('')
  const [tenureDays, setTenureDays] = useState('')
  const [frequency, setFrequency] = useState('daily')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const calc = useMemo(
    () => computeLoan({ amountGiven, interestAmount, tenureDays, frequency }),
    [amountGiven, interestAmount, tenureDays, frequency]
  )

  const save = async () => {
    setError(null)
    if (!amountGiven || Number(amountGiven) <= 0) return setError('Enter amount given')
    if (!tenureDays || Number(tenureDays) <= 0) return setError('Enter tenure in days')
    setSaving(true)
    try {
      const loan = await api.createLoan({
        customer_id: customerId,
        amount_given: Number(amountGiven),
        interest_amount: Number(interestAmount) || 0,
        total_to_receive: calc.total_to_receive,
        tenure_days: Number(tenureDays),
        frequency,
        installment_count: calc.installment_count,
        installment_amount: calc.installment_amount,
        start_date: startDate,
        created_by: session.id
      })
      onSaved?.(loan)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  const field = 'w-full rounded-xl border border-slate-300 px-3 py-3 outline-none'

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium text-slate-600">Amount given (principal)</label>
        <input value={amountGiven} onChange={(e) => setAmountGiven(e.target.value)}
          inputMode="decimal" placeholder="0" className={`${field} mt-1`} />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-600">Interest amount</label>
        <input value={interestAmount} onChange={(e) => setInterestAmount(e.target.value)}
          inputMode="decimal" placeholder="0" className={`${field} mt-1`} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-slate-600">Tenure (days)</label>
          <input value={tenureDays} onChange={(e) => setTenureDays(e.target.value)}
            inputMode="numeric" placeholder="0" className={`${field} mt-1`} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600">Frequency</label>
          <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className={`${field} mt-1 bg-white`}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-slate-600">Start date</label>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`${field} mt-1`} />
      </div>

      {/* Live calculation */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm space-y-1">
        <Row label="Total to receive" value={`₹${fmt(calc.total_to_receive)}`} strong />
        <Row label="Installments" value={calc.installment_count} />
        <Row label="Each installment" value={`₹${fmt(calc.installment_amount)}`} />
        <Row label="Interest markup" value={`₹${fmt(Number(interestAmount) || 0)}`} accent />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex gap-3 pt-1">
        {onCancel && (
          <button onClick={onCancel} className="flex-1 rounded-xl border border-slate-300 py-3 font-semibold text-slate-600">
            Cancel
          </button>
        )}
        <button onClick={save} disabled={saving}
          className="flex-1 rounded-xl bg-money-out text-white font-semibold py-3 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Loan'}
        </button>
      </div>
    </div>
  )
}

function Row({ label, value, strong, accent }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={`${strong ? 'font-bold' : 'font-medium'} ${accent ? 'text-money-out' : 'text-slate-800'}`}>
        {value}
      </span>
    </div>
  )
}
