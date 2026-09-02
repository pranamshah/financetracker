import { sql, send } from './_db.js'

// GET /api/summary?range=today|week|month&member_id=<uuid>
// Returns collected (inflow), given (outflow), net, entry_count, new_customers.
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

    const inflow = (await sql`
      select coalesce(sum(amount),0) as total, count(*) as cnt
      from entries
      where entry_date >= ${startExpr}
        and (${member_id}::uuid is null or member_id = ${member_id}::uuid)`)[0]

    const outflow = (await sql`
      select coalesce(sum(amount_given),0) as total
      from loans
      where start_date >= ${startExpr}
        and (${member_id}::uuid is null or created_by = ${member_id}::uuid)`)[0]

    const newCust = (await sql`
      select count(*) as cnt
      from customers
      where created_at >= ${startExpr}
        and (${member_id}::uuid is null or added_by = ${member_id}::uuid)`)[0]

    const collected = Number(inflow.total)
    const given = Number(outflow.total)
    return send(res, 200, {
      range,
      collected,
      given,
      net: collected - given,
      entry_count: Number(inflow.cnt),
      new_customers: Number(newCust.cnt)
    })
  } catch (e) {
    return send(res, 500, { error: e.message })
  }
}
