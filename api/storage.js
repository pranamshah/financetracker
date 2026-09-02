import { sql, send } from './_db.js'

// GET /api/storage -> approximate database size vs the free-tier limit + counts.
// CockroachDB has no pg_database_size, so we estimate from row counts
// (~0.5 KB per row incl. indexes) which is plenty accurate for a usage gauge.
const FREE_LIMIT = 10 * 1024 * 1024 * 1024 // CockroachDB Basic free ~10 GB
const BYTES_PER_ROW = 512

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' })
    const counts = (await sql`
      select
        (select count(*) from customers) as customers,
        (select count(*) from loans) as loans,
        (select count(*) from entries) as entries`)[0]
    const rows = Number(counts.customers) + Number(counts.loans) + Number(counts.entries)
    const used = rows * BYTES_PER_ROW
    return send(res, 200, {
      used_bytes: used,
      limit_bytes: FREE_LIMIT,
      percent: Math.min(100, Math.round((used / FREE_LIMIT) * 1000) / 10),
      customers: Number(counts.customers),
      loans: Number(counts.loans),
      entries: Number(counts.entries),
      estimated: true
    })
  } catch (e) {
    return send(res, 500, { error: e.message })
  }
}
