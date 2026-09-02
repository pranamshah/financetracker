import pg from 'pg'

// Standard Postgres driver (works with CockroachDB, Neon, Supabase, any
// Postgres). A module-level pool is reused across warm serverless invocations.
const { Pool } = pg

let pool
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Cloud Postgres (CockroachDB/Neon) needs TLS. Encrypted either way.
      ssl: { rejectUnauthorized: false },
      max: 3,
      idleTimeoutMillis: 10000
    })
  }
  return pool
}

// Tagged-template `sql` compatible with how the endpoints call it:
//   const rows = await sql`select ... where id = ${id}`
// Converts ${..} into $1,$2 parameters and returns the rows array.
export function sql(strings, ...values) {
  let text = ''
  strings.forEach((s, i) => {
    text += s
    if (i < values.length) text += '$' + (i + 1)
  })
  return getPool().query(text, values).then((r) => r.rows)
}

export function send(res, status, body) {
  res.setHeader('Content-Type', 'application/json')
  res.status(status).json(body)
}

// Start date (YYYY-MM-DD, India time) for a range. Computed in JS and passed
// as a plain value.
export function istStart(range) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
  })
  const todayStr = fmt.format(new Date())
  if (range === 'all') return '1970-01-01'
  if (range === 'week') {
    const [y, m, d] = todayStr.split('-').map(Number)
    const dt = new Date(Date.UTC(y, m - 1, d))
    const dow = dt.getUTCDay()
    dt.setUTCDate(dt.getUTCDate() - (dow === 0 ? 6 : dow - 1))
    return dt.toISOString().slice(0, 10)
  }
  if (range === 'month') return todayStr.slice(0, 7) + '-01'
  return todayStr
}

export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string' && req.body) return JSON.parse(req.body)
  const chunks = []
  for await (const c of req) chunks.push(c)
  if (!chunks.length) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}
