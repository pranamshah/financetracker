import { neon } from '@neondatabase/serverless'

// Shared Neon SQL client. Files prefixed with `_` are not routed by Vercel.
export const sql = neon(process.env.DATABASE_URL)

export function send(res, status, body) {
  res.setHeader('Content-Type', 'application/json')
  res.status(status).json(body)
}

// Start date (YYYY-MM-DD, India time) for a range. Computed in JS and passed
// as a plain value — Neon's driver can't take a SQL expression as a parameter.
export function istStart(range) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
  })
  const todayStr = fmt.format(new Date()) // YYYY-MM-DD in IST
  if (range === 'all') return '1970-01-01'
  if (range === 'week') {
    const [y, m, d] = todayStr.split('-').map(Number)
    const dt = new Date(Date.UTC(y, m - 1, d))
    const dow = dt.getUTCDay() // 0 Sun .. 6 Sat
    dt.setUTCDate(dt.getUTCDate() - (dow === 0 ? 6 : dow - 1)) // back to Monday
    return dt.toISOString().slice(0, 10)
  }
  if (range === 'month') return todayStr.slice(0, 7) + '-01'
  return todayStr // today
}

export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string' && req.body) return JSON.parse(req.body)
  const chunks = []
  for await (const c of req) chunks.push(c)
  if (!chunks.length) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}
