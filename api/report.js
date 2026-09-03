import { sql, send, istStart } from './_db.js'

// GET /api/report?range=today|week|month|all|custom&from=YYYY-MM-DD&to=YYYY-MM-DD&member_id=<uuid>&group=day
export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' })
    const range = req.query.range || 'today'
    const member_id = req.query.member_id || null
    const group = req.query.group || 'day'

    // Custom date range overrides range preset
    let start, end
    if (range === 'custom' && req.query.from) {
      start = req.query.from
      end = req.query.to || istStart('today')
    } else {
      start = istStart(range)
      end = istStart('today')
    }

    const rows = group === 'customer'
      ? await sql`
        select e.id, e.amount, e.entry_date, e.note, e.member_id, m.name as member_name,
          c.id as customer_id, c.name as customer_name, c.phone,
          l.id as loan_id, l.amount_given, l.interest_amount, l.total_to_receive, l.frequency, l.start_date, l.status,
          coalesce((select sum(e2.amount) from entries e2 where e2.loan_id = l.id), 0) as loan_collected
        from entries e
        join customers c on c.id = e.customer_id
        join loans l on l.id = e.loan_id
        left join members m on m.id = e.member_id
        where e.entry_date >= ${start}::date and e.entry_date <= ${end}::date
          and (${member_id}::uuid is null or e.member_id = ${member_id}::uuid)
        order by lower(c.name) asc, l.created_at asc, e.entry_date asc, e.created_at asc`
      : await sql`
        select e.id, e.amount, e.entry_date, e.note, e.member_id, m.name as member_name,
          c.id as customer_id, c.name as customer_name, c.phone,
          l.id as loan_id, l.amount_given, l.interest_amount, l.total_to_receive, l.frequency, l.start_date, l.status,
          coalesce((select sum(e2.amount) from entries e2 where e2.loan_id = l.id), 0) as loan_collected
        from entries e
        join customers c on c.id = e.customer_id
        join loans l on l.id = e.loan_id
        left join members m on m.id = e.member_id
        where e.entry_date >= ${start}::date and e.entry_date <= ${end}::date
          and (${member_id}::uuid is null or e.member_id = ${member_id}::uuid)
        order by e.entry_date asc, e.created_at asc, lower(c.name) asc`

    const given = (await sql`
      select coalesce(sum(amount_given),0) as total
      from loans
      where start_date >= ${start}::date and start_date <= ${end}::date
        and (${member_id}::uuid is null or created_by = ${member_id}::uuid)`)[0]

    return send(res, 200, { range, group, given: Number(given.total), rows, from: start, to: end })
  } catch (e) {
    return send(res, 500, { error: e.message })
  }
}
