import { sql, send } from './_db.js'

// GET /api/alldata -> every customer with all their loans and entries,
// sorted by customer name. Used for the admin "Download all data" PDF backup.
export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' })

    const customers = await sql`
      select id, name, phone from customers order by lower(name) asc`
    const loans = await sql`
      select l.*, coalesce((select sum(e.amount) from entries e where e.loan_id = l.id),0) as collected
      from loans l order by l.created_at asc`
    const entries = await sql`
      select e.id, e.loan_id, e.customer_id, e.amount, e.entry_date, e.note, m.name as member_name
      from entries e left join members m on m.id = e.member_id
      order by e.entry_date asc, e.created_at asc`

    return send(res, 200, { customers, loans, entries })
  } catch (e) {
    return send(res, 500, { error: e.message })
  }
}
