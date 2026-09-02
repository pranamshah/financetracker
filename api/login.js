import { sql, send, readBody } from './_db.js'

// POST /api/login { pin } -> { id, name, role } or 404.
// Login is by a 4-digit PIN. PINs are unique per person.
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' })
    const body = await readBody(req)
    const pin = String(body.pin ?? body.username ?? '').trim()
    if (!/^\d{4}$/.test(pin)) return send(res, 400, { error: 'Enter your 4-digit PIN' })
    const rows = await sql`select id, name, role from members where pin = ${pin}`
    if (rows.length === 0) return send(res, 404, { error: 'Wrong PIN' })
    return send(res, 200, rows[0])
  } catch (e) {
    return send(res, 500, { error: e.message })
  }
}
