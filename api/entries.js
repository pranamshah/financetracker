import { sql, send, readBody } from './_db.js'

// GET  /api/entries?date=today&employee_id=<uuid>  -> entries for a day
//      date defaults to today (server date). employee_id optional filter.
// POST /api/entries -> create { loan_id, customer_id, employee_id, amount, note, entry_date }
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { employee_id, date } = req.query
      const useDate = !date || date === 'today'
      let rows
      if (useDate && employee_id) {
        rows = await sql`
          select e.*, c.name as customer_name, emp.name as employee_name
          from entries e
          join customers c on c.id = e.customer_id
          left join employees emp on emp.id = e.employee_id
          where e.entry_date = current_date and e.employee_id = ${employee_id}
          order by e.created_at desc`
      } else if (useDate) {
        rows = await sql`
          select e.*, c.name as customer_name, emp.name as employee_name
          from entries e
          join customers c on c.id = e.customer_id
          left join employees emp on emp.id = e.employee_id
          where e.entry_date = current_date
          order by e.created_at desc`
      } else if (employee_id) {
        rows = await sql`
          select e.*, c.name as customer_name, emp.name as employee_name
          from entries e
          join customers c on c.id = e.customer_id
          left join employees emp on emp.id = e.employee_id
          where e.entry_date = ${date} and e.employee_id = ${employee_id}
          order by e.created_at desc`
      } else {
        rows = await sql`
          select e.*, c.name as customer_name, emp.name as employee_name
          from entries e
          join customers c on c.id = e.customer_id
          left join employees emp on emp.id = e.employee_id
          where e.entry_date = ${date}
          order by e.created_at desc`
      }
      return send(res, 200, rows)
    }

    if (req.method === 'POST') {
      const { loan_id, customer_id, employee_id, amount, note, entry_date } = await readBody(req)
      if (!loan_id || !customer_id || amount == null) {
        return send(res, 400, { error: 'loan_id, customer_id and amount are required' })
      }
      const rows = await sql`
        insert into entries (loan_id, customer_id, employee_id, amount, note, entry_date)
        values (${loan_id}, ${customer_id}, ${employee_id || null}, ${amount}, ${note || null},
                ${entry_date || null})
        returning *`

      // Auto-close loan when fully collected.
      await sql`
        update loans l set status = 'closed'
        where l.id = ${loan_id}
          and l.status = 'active'
          and (select coalesce(sum(e.amount),0) from entries e where e.loan_id = l.id) >= l.total_to_receive`

      return send(res, 201, rows[0])
    }

    return send(res, 405, { error: 'Method not allowed' })
  } catch (e) {
    return send(res, 500, { error: e.message })
  }
}
