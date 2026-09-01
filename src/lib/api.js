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
  login: (username) => req('login', { method: 'POST', body: JSON.stringify({ username }) }),
  members: () => req('members'),
  memberStats: () => req('members?stats=1'),

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

  summary: ({ range = 'today', memberId } = {}) => {
    const p = new URLSearchParams({ range })
    if (memberId) p.set('member_id', memberId)
    return req(`summary?${p.toString()}`)
  },

  report: ({ range = 'today', memberId } = {}) => {
    const p = new URLSearchParams({ range })
    if (memberId) p.set('member_id', memberId)
    return req(`report?${p.toString()}`)
  }
}
