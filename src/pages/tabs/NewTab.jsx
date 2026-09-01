import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useSession } from '../../context/SessionContext.jsx'
import LoanForm from '../../components/LoanForm.jsx'

export default function NewTab({ onDone }) {
  const { session } = useSession()
  const navigate = useNavigate()
  const [step, setStep] = useState('customer') // customer | ask | loan
  const [customer, setCustomer] = useState(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const field = 'w-full rounded-xl border border-slate-300 px-3 py-3 outline-none'

  const saveCustomer = async () => {
    setError(null)
    if (!name.trim()) return setError('Name is required')
    setSaving(true)
    try {
      const c = await api.createCustomer({
        name, phone: phone || null, address: address || null, added_by: session.id
      })
      setCustomer(c)
      setStep('ask')
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (step === 'customer') {
    return (
      <div className="space-y-3">
        <h2 className="font-bold text-slate-700">New Customer</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name *" className={field} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" inputMode="tel" className={field} />
        <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address (optional)" rows={2} className={field} />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button onClick={saveCustomer} disabled={saving}
          className="w-full rounded-xl bg-money-in text-white font-semibold py-3.5 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Customer'}
        </button>
      </div>
    )
  }

  if (step === 'ask') {
    return (
      <div className="text-center py-8 space-y-4">
        <p className="text-lg font-semibold">Customer “{customer.name}” added ✓</p>
        <p className="text-slate-500">Add a loan now?</p>
        <div className="flex gap-3">
          <button onClick={() => onDone?.()} className="flex-1 rounded-xl border border-slate-300 py-3 font-semibold text-slate-600">
            Later
          </button>
          <button onClick={() => setStep('loan')} className="flex-1 rounded-xl bg-money-out text-white py-3 font-semibold">
            Add Loan
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h2 className="font-bold text-slate-700">New Loan · {customer.name}</h2>
      <LoanForm
        customerId={customer.id}
        onSaved={() => navigate(`/customer/${customer.id}`)}
        onCancel={() => onDone?.()}
      />
    </div>
  )
}
