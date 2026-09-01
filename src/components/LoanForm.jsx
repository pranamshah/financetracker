import { useMemo, useState } from 'react'
import { api } from '../lib/api.js'
import { computeFromTotal, fmt } from '../lib/calc.js'
import { useSession } from '../context/SessionContext.jsx'

const FREQ = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' }
const PER = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' }

// Loan form: amount given -> number of days -> frequency (daily default) ->
// amount to be received. Interest and the per-installment amount are shown live.
export default function LoanForm({ customerId, onSaved, onCancel }) {
  const { session } = useSession()
  const [amountGiven, setAmountGiven] = useState('')
  const [tenureDays, setTenureDays] = useState('')
  const [frequency, setFrequency] = useState('daily')
  const [totalToReceive, setTotalToReceive] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const calc = useMemo(
    () => computeFromTotal({ amountGiven, totalToReceive, tenureDays, frequency }),
    [amountGiven, totalToReceive, tenureDays, frequency]
  )

  const save = async () => {
    setError(null)
    if (!amountGiven || Number(amountGiven) <= 0) return setError('Enter amount given')
    if (!tenureDays || Number(tenureDays) <= 0) return setError('Enter number of days')
    if (!totalToReceive || Number(totalToReceive) <= 0) return setError('Enter amount to be received')
    setSaving(true)
    try {
      const loan = await api.createLoan({
        customer_id: customerId,
        amount_given: Number(amountGiven),
        interest_amount: calc.interest_amount,
        total_to_receive: calc.total_to_receive,
        tenure_days: Number(tenureDays),
        frequency,
        installment_count: calc.installment_count,
        installment_amount: calc.installment_amount,
        start_date: new Date().toISOString().slice(0, 10),
        created_by: session.id
      })
      onSaved?.(loan)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  const field = 'w-full rounded-xl border border-slate-200 px-3 py-3 outline-none focus:border-money-in'

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium text-slate-600">Amount given</label>
        <input value={amountGiven} onChange={(e) => setAmountGiven(e.target.value)}
          inputMode="decimal" placeholder="0" className={`${field} mt-1`} />
      </div>

      <div>
        <label className="text-sm font-medium text-slate-600">Number of days</label>
        <input value={tenureDays} onChange={(e) => setTenureDays(e.target.value)}
          inputMode="numeric" placeholder="0" className={`${field} mt-1`} />
      </div>

      <div>
        <label className="text-sm font-medium text-slate-600">Payment frequency</label>
        <div className="mt-1 grid grid-cols-4 gap-2">
          {Object.entries(FREQ).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setFrequency(k)}
              className={`rounded-xl py-2 text-sm font-semibold border ${
                frequency === k ? 'bg-money-in text-white border-money-in' : 'bg-white text-slate-500 border-slate-200'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-600">Amount to be received</label>
        <input value={totalToReceive} onChange={(e) => setTotalToReceive(e.target.value)}
          inputMode="decimal" placeholder="0" className={`${field} mt-1`} />
      </div>

      {/* Live calculation */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm space-y-1">
        <Row label={`Each ${PER[frequency]} (${calc.installment_count}×)`} value={`₹${fmt(calc.installment_amount)}`} strong />
        <Row label="Interest (received − given)" value={`₹${fmt(calc.interest_amount)}`} accent />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex gap-3 pt-1">
        {onCancel && (
          <button onClick={onCancel} className="flex-1 rounded-xl border border-slate-300 py-3 font-semibold text-slate-600">Cancel</button>
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
      <span className={`${strong ? 'font-bold' : 'font-medium'} ${accent ? 'text-money-out' : 'text-slate-800'}`}>{value}</span>
    </div>
  )
}
