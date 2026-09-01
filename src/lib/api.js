// Tiny fetch wrapper around the /api serverless endpoints.
async function req(path, options = {}) {
  const res = await fetch(`/api/${path}`, {
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

  customers: (search) => req(`customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
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
