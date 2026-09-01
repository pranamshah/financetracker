import { sql, send, readBody } from './_db.js'

// GET  /api/loans?customer_id=<uuid>&status=active  -> loans for a customer (with balance)
// POST /api/loans -> create a loan
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { customer_id, status } = req.query
      if (!customer_id) return send(res, 400, { error: 'customer_id required' })
      const rows = status
        ? await sql`
            select l.*, coalesce((select sum(e.amount) from entries e where e.loan_id = l.id),0) as collected
            from loans l where l.customer_id = ${customer_id} and l.status = ${status}
            order by l.created_at desc`
        : await sql`
            select l.*, coalesce((select sum(e.amount) from entries e where e.loan_id = l.id),0) as collected
            from loans l where l.customer_id = ${customer_id}
            order by l.created_at desc`
      return send(res, 200, rows)
    }

    if (req.method === 'POST') {
      const b = await readBody(req)
      const {
        customer_id, amount_given, interest_amount, total_to_receive,
        tenure_days, frequency, installment_count, installment_amount,
        start_date, created_by
      } = b
      if (!customer_id || amount_given == null || !frequency || !tenure_days) {
        return send(res, 400, { error: 'customer_id, amount_given, tenure_days and frequency are required' })
      }
      const rows = await sql`
        insert into loans (
          customer_id, amount_given, interest_amount, total_to_receive,
          tenure_days, frequency, installment_count, installment_amount,
          start_date, created_by
        ) values (
          ${customer_id}, ${amount_given}, ${interest_amount || 0}, ${total_to_receive},
          ${tenure_days}, ${frequency}, ${installment_count}, ${installment_amount},
          ${start_date || null}, ${created_by || null}
        )
        returning *`
      return send(res, 201, rows[0])
    }

    return send(res, 405, { error: 'Method not allowed' })
  } catch (e) {
    return send(res, 500, { error: e.message })
  }
}
