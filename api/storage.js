import { sql, send } from './_db.js'

// GET /api/storage -> approximate size of your DATA vs the free-tier limit.
// We estimate from row counts (~0.5 KB per row incl. indexes) rather than
// pg_database_size, so the empty-database overhead (~30 MB) doesn't confuse
// the gauge — this shows how much of the limit YOUR data actually uses.
const FREE_LIMIT = 512 * 1024 * 1024 // Neon free tier ~0.5 GB
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
