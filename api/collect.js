import { sql, send, readBody } from './_db.js'

// POST /api/collect { customer_id, member_id, amount, note }
// One quick payment for a customer. If the customer has multiple active loans,
// the amount is split across them (oldest first, filling each loan's remaining
// balance) and recorded as SEPARATE entries per loan — so each loan's history
// stays clean, while the collector only types one number.
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' })
    const { customer_id, member_id, amount, note } = await readBody(req)
    if (!customer_id || amount == null || Number(amount) <= 0) {
      return send(res, 400, { error: 'customer_id and a positive amount are required' })
    }

    const loans = await sql`
      select l.id, l.total_to_receive,
             coalesce((select sum(e.amount) from entries e where e.loan_id = l.id), 0) as collected
      from loans l
      where l.customer_id = ${customer_id} and l.status = 'active'
      order by l.created_at asc`

    if (loans.length === 0) return send(res, 400, { error: 'This customer has no active loan' })

    let left = Number(amount)
    const created = []

    for (let i = 0; i < loans.length && left > 0; i++) {
      const l = loans[i]
      const remaining = Number(l.total_to_receive) - Number(l.collected)
      if (remaining <= 0) continue
      const isLast = i === loans.length - 1
      // Fill this loan's balance; the last active loan soaks up any overpayment.
      const pay = isLast ? left : Math.min(remaining, left)
      if (pay <= 0) continue
      const row = await sql`
        insert into entries (loan_id, customer_id, member_id, amount, note, entry_date)
        values (${l.id}, ${customer_id}, ${member_id || null}, ${pay}, ${note || null},
                (now() at time zone 'Asia/Kolkata')::date)
        returning *`
      created.push(row[0])
      left -= pay
      // Auto-close a loan once fully collected.
      await sql`
        update loans l set status = 'closed'
        where l.id = ${l.id} and l.status = 'active'
          and (select coalesce(sum(e.amount),0) from entries e where e.loan_id = l.id) >= l.total_to_receive`
    }

    // If every active loan was already full, still record on the last loan.
    if (created.length === 0) {
      const l = loans[loans.length - 1]
      const row = await sql`
        insert into entries (loan_id, customer_id, member_id, amount, note, entry_date)
        values (${l.id}, ${customer_id}, ${member_id || null}, ${amount}, ${note || null},
                (now() at time zone 'Asia/Kolkata')::date)
        returning *`
      created.push(row[0])
    }

    return send(res, 201, { entries: created, split: created.length })
  } catch (e) {
    return send(res, 500, { error: e.message })
  }
}
