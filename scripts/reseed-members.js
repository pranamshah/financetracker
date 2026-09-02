// Add the pin column (if missing), then set the real members + PINs.
// PINs must be unique. Safe to re-run. Usage: node scripts/reseed-members.js
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)

// The real members. Add more here as names + pins come in (keep pins unique).
const MEMBERS = [
  { username: 'sailesh', name: 'Sailesh', role: 'admin', pin: '2904' },
  { username: 'sarath', name: 'Sarath', role: 'member', pin: '0000' }
]

const run = async () => {
  await sql`alter table members add column if not exists pin text`
  // drop old placeholders with no data
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
      insert into members (username, name, role, pin)
      values (${m.username}, ${m.name}, ${m.role}, ${m.pin})
      on conflict (username) do update set name = excluded.name, role = excluded.role, pin = excluded.pin`
  }
  await sql`create unique index if not exists members_pin_unique on members(pin)`
  const rows = await sql`select username, name, role, pin from members order by role desc, name`
  console.log('Members now:', JSON.stringify(rows))
}

run().catch((e) => { console.error(e); process.exit(1) })
