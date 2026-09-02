import { sql, send } from './_db.js'

// GET /api/storage -> database size vs the Neon free-tier limit, plus counts.
const FREE_LIMIT = 512 * 1024 * 1024 // 0.5 GB

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' })
    const size = Number((await sql`select pg_database_size(current_database()) as b`)[0].b)
    const counts = (await sql`
      select
        (select count(*) from customers) as customers,
        (select count(*) from loans) as loans,
        (select count(*) from entries) as entries`)[0]
    return send(res, 200, {
      used_bytes: size,
      limit_bytes: FREE_LIMIT,
      percent: Math.min(100, Math.round((size / FREE_LIMIT) * 1000) / 10),
      customers: Number(counts.customers),
      loans: Number(counts.loans),
      entries: Number(counts.entries)
    })
  } catch (e) {
    return send(res, 500, { error: e.message })
  }
}
