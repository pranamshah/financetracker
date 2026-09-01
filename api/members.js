import { sql, send } from './_db.js'

// GET /api/members -> list of members (used only by the admin's filter dropdown).
export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' })
    const rows = await sql`select id, name, role from members order by name asc`
    return send(res, 200, rows)
  } catch (e) {
    return send(res, 500, { error: e.message })
  }
}
