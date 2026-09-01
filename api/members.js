import { sql, send } from './_db.js'

// GET /api/members            -> list of members (for the admin filter dropdown)
// GET /api/members?stats=1    -> same, plus each member's today/customer totals
//                               (used by the admin-only Members overview)
export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' })

    if (req.query.stats) {
      const rows = await sql`
        select
          m.id, m.name, m.role,
          (select coalesce(sum(e.amount),0) from entries e
             where e.member_id = m.id and e.entry_date = current_date) as today_collected,
          (select count(*) from entries e
             where e.member_id = m.id and e.entry_date = current_date) as today_entries,
          (select count(distinct c.id) from customers c where c.added_by = m.id) as customers
        from members m
        order by (m.role = 'admin') desc, lower(m.name) asc`
      return send(res, 200, rows)
    }

    const rows = await sql`select id, name, role from members order by name asc`
    return send(res, 200, rows)
  } catch (e) {
    return send(res, 500, { error: e.message })
  }
}
