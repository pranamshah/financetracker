// Replace placeholder members with the real ones, preserving any that already
// have data. Safe to re-run. Usage: node scripts/reseed-members.js
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)

// The real members. Add more here as names come in.
const MEMBERS = [
  { username: 'sailesh', name: 'Sailesh', role: 'admin' },
  { username: 'sarath', name: 'Sarath', role: 'member' }
]

const run = async () => {
  // Remove seed placeholders only if they carry no data (no FK references).
  for (const u of ['owner', 'm1', 'm2']) {
    await sql`
      delete from members m
      where m.username = ${u}
        and not exists (select 1 from customers c where c.added_by = m.id)
        and not exists (select 1 from loans l where l.created_by = m.id)
        and not exists (select 1 from entries e where e.member_id = m.id)`
  }
  for (const m of MEMBERS) {
    await sql`
      insert into members (username, name, role)
      values (${m.username}, ${m.name}, ${m.role})
      on conflict (username) do update set name = excluded.name, role = excluded.role`
  }
  const rows = await sql`select username, name, role from members order by role desc, name`
  console.log('Members now:', JSON.stringify(rows))
}

run().catch((e) => { console.error(e); process.exit(1) })
