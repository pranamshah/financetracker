import { sql, send, istStart } from './_db.js'

// GET /api/alerts?date=YYYY-MM-DD&member_id=<uuid>
// Returns customers with active loans who have NO entry on the given date.
export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' })
    const date = req.query.date || istStart('today')
    const member_id = req.query.member_id || null

    const rows = member_id
      ? await sql`
          select c.id, c.name, c.phone,
            count(l.id) as active_loans,
            coalesce(sum(l.total_to_receive),0) as total_to_receive,
            coalesce((select sum(e2.amount) from entries e2 where e2.customer_id = c.id),0) as total_collected
          from customers c
          join loans l on l.customer_id = c.id and l.status = 'active'
          where not exists (
            select 1 from entries e where e.customer_id = c.id and e.entry_date = ${date}
          )
          and (
            c.added_by = ${member_id}
            or exists (select 1 from entries e where e.customer_id = c.id and e.member_id = ${member_id})
            or exists (select 1 from loans l2 where l2.customer_id = c.id and l2.created_by = ${member_id})
          )
          group by c.id, c.name, c.phone
          order by c.name asc`
      : await sql`
          select c.id, c.name, c.phone,
            count(l.id) as active_loans,
            coalesce(sum(l.total_to_receive),0) as total_to_receive,
            coalesce((select sum(e2.amount) from entries e2 where e2.customer_id = c.id),0) as total_collected
          from customers c
          join loans l on l.customer_id = c.id and l.status = 'active'
          where not exists (
            select 1 from entries e where e.customer_id = c.id and e.entry_date = ${date}
          )
          group by c.id, c.name, c.phone
          order by c.name asc`

    return send(res, 200, { date, count: rows.length, rows })
  } catch (e) {
    return send(res, 500, { error: e.message })
  }
}
