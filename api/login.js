import { sql, send, readBody } from './_db.js'

// POST /api/login { username } -> { id, name, role } or 404.
// No listing endpoint for names: you must know your own username to get in.
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' })
    const { username } = await readBody(req)
    if (!username || !username.trim()) return send(res, 400, { error: 'Username is required' })
    const q = username.trim().toLowerCase()
    // Accept either the username or the person's name (case-insensitive) —
    // "just enter your name".
    const rows = await sql`
      select id, name, role from members
      where lower(username) = ${q} or lower(name) = ${q}`
    if (rows.length === 0) return send(res, 404, { error: 'Name not found' })
    return send(res, 200, rows[0])
  } catch (e) {
    return send(res, 500, { error: e.message })
  }
}
