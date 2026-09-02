import { sql, send, readBody } from './_db.js'

// GET  /api/customers                 -> list all (with balance summary)
// GET  /api/customers?id=<uuid>       -> single customer + loans + entries
// GET  /api/customers?search=<text>   -> filtered list
// POST /api/customers                 -> create { name, phone, address, added_by }
export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const { id, search } = req.query
      if (id) return send(res, 200, await getDetail(id))

      // member_id scopes the list to that person's own customers (admin omits
      // it -> sees everyone). "Own" = added by them, or they collected on /
      // created a loan for that customer.
      const member_id = req.query.member_id || null
      const term = search ? `%${search.toLowerCase()}%` : null
      const rows = await sql`
        select c.id, c.name, c.phone, c.address, c.added_by,
          m.name as added_by_name,
          coalesce((select sum(l.total_to_receive) from loans l where l.customer_id = c.id),0) as total_to_receive,
          coalesce((select sum(l.amount_given) from loans l where l.customer_id = c.id),0) as total_given,
          coalesce((select sum(e.amount) from entries e where e.customer_id = c.id),0) as collected
        from customers c
        left join members m on m.id = c.added_by
        where (${term}::text is null or lower(c.name) like ${term})
          and (
            ${member_id}::uuid is null
            or c.added_by = ${member_id}::uuid
            or exists (select 1 from entries e where e.customer_id = c.id and e.member_id = ${member_id}::uuid)
            or exists (select 1 from loans l where l.customer_id = c.id and l.created_by = ${member_id}::uuid)
          )
        order by c.name asc`
      return send(res, 200, rows)
    }

    if (req.method === 'POST') {
      const { name, phone, address, added_by } = await readBody(req)
      if (!name || !name.trim()) return send(res, 400, { error: 'name is required' })
      const rows = await sql`
        insert into customers (name, phone, address, added_by)
        values (${name.trim()}, ${phone || null}, ${address || null}, ${added_by || null})
        returning id, name, phone, address, added_by`
      return send(res, 201, rows[0])
    }

    if (req.method === 'DELETE') {
      const id = req.query.id
      if (!id) return send(res, 400, { error: 'id required' })
      // Cascades to this customer's loans and entries.
      const gone = await sql`delete from customers where id = ${id} returning id`
      if (gone.length === 0) return send(res, 404, { error: 'not found' })
      return send(res, 200, { ok: true })
    }

    return send(res, 405, { error: 'Method not allowed' })
  } catch (e) {
    return send(res, 500, { error: e.message })
  }
}

async function getDetail(id) {
  const customer = (await sql`
    select id, name, phone, address, added_by from customers where id = ${id}`)[0]
  if (!customer) return { error: 'not found' }

  const loans = await sql`
    select l.*,
      coalesce((select sum(e.amount) from entries e where e.loan_id = l.id), 0) as collected
    from loans l
    where l.customer_id = ${id}
    order by l.created_at desc`

  const entries = await sql`
    select e.id, e.loan_id, e.amount, e.entry_date, e.note, e.member_id,
           m.name as member_name
    from entries e
    left join members m on m.id = e.member_id
    where e.customer_id = ${id}
    order by e.entry_date desc, e.created_at desc`

  return { customer, loans, entries }
}
