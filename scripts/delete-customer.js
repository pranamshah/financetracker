// Delete a customer and all their loans/entries (cascades). Dev utility.
// Usage: node scripts/delete-customer.js <customer_id>
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL)
const id = process.argv[2]
if (!id) { console.error('pass a customer id'); process.exit(1) }
const run = async () => {
  await sql`delete from customers where id = ${id}`
  console.log('deleted', id)
}
run().catch((e) => { console.error(e); process.exit(1) })
