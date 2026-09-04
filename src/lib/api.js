// Tiny fetch wrapper around the /api serverless endpoints.
// On the website this is empty (relative /api). In the Android APK the web
// assets load from file://, so set VITE_API_BASE to the deployed Vercel URL
// (e.g. https://your-app.vercel.app) at build time so it can reach the API.
const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

async function req(path, options = {}) {
  const res = await fetch(`${BASE}/api/${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

export const api = {
  login: (pin) => req('login', { method: 'POST', body: JSON.stringify({ pin }) }),
  members: () => req('members'),
  memberStats: () => req('members?stats=1'),
  allData: () => req('alldata'),
  storage: () => req('storage'),
  deleteCustomer: (id) => req(`customers?id=${id}`, { method: 'DELETE' }),
  deleteLoan: (id) => req(`loans?id=${id}`, { method: 'DELETE' }),

  customers: ({ search, memberId } = {}) => {
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    if (memberId) p.set('member_id', memberId)
    const qs = p.toString()
    return req(`customers${qs ? `?${qs}` : ''}`)
  },
  customer: (id) => req(`customers?id=${id}`),
  createCustomer: (body) => req('customers', { method: 'POST', body: JSON.stringify(body) }),

  loans: (customerId, status) =>
    req(`loans?customer_id=${customerId}${status ? `&status=${status}` : ''}`),
  createLoan: (body) => req('loans', { method: 'POST', body: JSON.stringify(body) }),

  entries: ({ memberId, date } = {}) => {
    const p = new URLSearchParams()
    if (memberId) p.set('member_id', memberId)
    if (date) p.set('date', date)
    const qs = p.toString()
    return req(`entries${qs ? `?${qs}` : ''}`)
  },
  createEntry: (body) => req('entries', { method: 'POST', body: JSON.stringify(body) }),
  collect: (body) => req('collect', { method: 'POST', body: JSON.stringify(body) }),
  deleteEntry: (id) => req(`entries?id=${id}`, { method: 'DELETE' }),

  summary: ({ range = 'today', memberId } = {}) => {
    const p = new URLSearchParams({ range })
    if (memberId) p.set('member_id', memberId)
    return req(`summary?${p.toString()}`)
  },

  alerts: ({ date, memberId } = {}) => {
    const p = new URLSearchParams()
    if (date) p.set('date', date)
    if (memberId) p.set('member_id', memberId)
    return req(`alerts?${p.toString()}`)
  },

  report: ({ range = 'today', memberId, group = 'day', from, to } = {}) => {
    const p = new URLSearchParams({ range, group })
    if (memberId) p.set('member_id', memberId)
    if (from) p.set('from', from)
    if (to) p.set('to', to)
    return req(`report?${p.toString()}`)
  }
}
