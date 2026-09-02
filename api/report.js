import { sql, send } from './_db.js'

// GET /api/report?range=today|week|month&member_id=<uuid>
// Returns every collection entry in the period, joined with its customer and
// loan, ordered by customer name then loan then date. The client groups these
// into a per-customer -> per-loan PDF.
export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' })
    const range = req.query.range || 'today'
    const member_id = req.query.member_id || null

    const startExpr = {
      today: sql`(now() at time zone 'Asia/Kolkata')::date`,
      week: sql`date_trunc('week', (now() at time zone 'Asia/Kolkata')::date)`,
      month: sql`date_trunc('month', (now() at time zone 'Asia/Kolkata')::date)`
    }[range] || sql`current_date`

    const rows = await sql`
      select
        e.id, e.amount, e.entry_date, e.note, e.member_id,
        m.name  as member_name,
        c.id    as customer_id, c.name as customer_name, c.phone, c.address,
        l.id    as loan_id, l.amount_given, l.interest_amount, l.total_to_receive,
        l.frequency, l.start_date, l.status, l.installment_amount, l.installment_count,
        coalesce((select sum(e2.amount) from entries e2 where e2.loan_id = l.id), 0) as loan_collected
      from entries e
      join customers c on c.id = e.customer_id
      join loans l on l.id = e.loan_id
      left join members m on m.id = e.member_id
      where e.entry_date >= ${startExpr}
        and (${member_id}::uuid is null or e.member_id = ${member_id}::uuid)
      order by lower(c.name) asc, l.created_at asc, e.entry_date asc, e.created_at asc`

    // Grand total of new loans given out in the same period (outflow).
    const given = (await sql`
      select coalesce(sum(amount_given),0) as total
      from loans
      where start_date >= ${startExpr}
        and (${member_id}::uuid is null or created_by = ${member_id}::uuid)`)[0]

    return send(res, 200, { range, given: Number(given.total), rows })
  } catch (e) {
    return send(res, 500, { error: e.message })
  }
}
