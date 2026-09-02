import { sql, send, readBody } from './_db.js'

// GET  /api/entries?date=today&member_id=<uuid>  -> entries for a day
//      date defaults to today (server date). member_id optional filter.
// POST /api/entries -> create { loan_id, customer_id, member_id, amount, note, entry_date }
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const member_id = req.query.member_id
      const date = req.query.date
      const useDate = !date || date === 'today'
      let rows
      if (useDate && member_id) {
        rows = await sql`
          select e.*, c.name as customer_name, m.name as member_name
          from entries e
          join customers c on c.id = e.customer_id
          left join members m on m.id = e.member_id
          where e.entry_date = (now() at time zone 'Asia/Kolkata')::date and e.member_id = ${member_id}
          order by e.created_at desc`
      } else if (useDate) {
        rows = await sql`
          select e.*, c.name as customer_name, m.name as member_name
          from entries e
          join customers c on c.id = e.customer_id
          left join members m on m.id = e.member_id
          where e.entry_date = (now() at time zone 'Asia/Kolkata')::date
          order by e.created_at desc`
      } else if (member_id) {
        rows = await sql`
          select e.*, c.name as customer_name, m.name as member_name
          from entries e
          join customers c on c.id = e.customer_id
          left join members m on m.id = e.member_id
          where e.entry_date = ${date} and e.member_id = ${member_id}
          order by e.created_at desc`
      } else {
        rows = await sql`
          select e.*, c.name as customer_name, m.name as member_name
          from entries e
          join customers c on c.id = e.customer_id
          left join members m on m.id = e.member_id
          where e.entry_date = ${date}
          order by e.created_at desc`
      }
      return send(res, 200, rows)
    }

    if (req.method === 'POST') {
      const { loan_id, customer_id, member_id, amount, note, entry_date } = await readBody(req)
      if (!loan_id || !customer_id || amount == null) {
        return send(res, 400, { error: 'loan_id, customer_id and amount are required' })
      }
      const rows = await sql`
        insert into entries (loan_id, customer_id, member_id, amount, note, entry_date)
        values (${loan_id}, ${customer_id}, ${member_id || null}, ${amount}, ${note || null},
                coalesce(${entry_date || null}::date, (now() at time zone 'Asia/Kolkata')::date))
        returning *`

      // Auto-close loan when fully collected.
      await sql`
        update loans l set status = 'closed'
        where l.id = ${loan_id}
          and l.status = 'active'
          and (select coalesce(sum(e.amount),0) from entries e where e.loan_id = l.id) >= l.total_to_receive`

      return send(res, 201, rows[0])
    }

    if (req.method === 'DELETE') {
      // Delete a wrong entry (correction). If its loan was closed and now
      // isn't fully collected again, reopen it.
      const id = req.query.id
      if (!id) return send(res, 400, { error: 'id required' })
      const gone = await sql`delete from entries where id = ${id} returning loan_id`
      if (gone.length === 0) return send(res, 404, { error: 'not found' })
      const loanId = gone[0].loan_id
      await sql`
        update loans l set status = 'active'
        where l.id = ${loanId} and l.status = 'closed'
          and (select coalesce(sum(e.amount),0) from entries e where e.loan_id = l.id) < l.total_to_receive`
      return send(res, 200, { ok: true })
    }

    return send(res, 405, { error: 'Method not allowed' })
  } catch (e) {
    return send(res, 500, { error: e.message })
  }
}
