// Migrate data from backups/neon-backup.json into a NEW Postgres/CockroachDB.
// Usage: TARGET_DATABASE_URL="postgresql://..." node scripts/migrate-to-new-db.js
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const url = process.env.TARGET_DATABASE_URL
if (!url) { console.error('Set TARGET_DATABASE_URL'); process.exit(1) }

const pool = new pg.Pool({ connectionString: url, ssl: { rejectUnauthorized: false } })
const dump = JSON.parse(readFileSync(join(__dirname, '..', 'backups', 'neon-backup.json'), 'utf8'))

const cols = {
  members: ['id', 'username', 'name', 'role', 'pin', 'created_at'],
  customers: ['id', 'name', 'phone', 'address', 'added_by', 'created_at'],
  loans: ['id', 'customer_id', 'amount_given', 'interest_amount', 'total_to_receive',
    'tenure_days', 'frequency', 'installment_count', 'installment_amount',
    'start_date', 'status', 'created_by', 'created_at'],
  entries: ['id', 'loan_id', 'customer_id', 'member_id', 'amount', 'entry_date', 'note', 'created_at']
}

async function insertAll(table, rows) {
  const c = cols[table]
  for (const row of rows) {
    const vals = c.map((k) => (row[k] === undefined ? null : row[k]))
    const ph = c.map((_, i) => '$' + (i + 1)).join(',')
    await pool.query(
      `insert into ${table} (${c.join(',')}) values (${ph}) on conflict (id) do nothing`,
      vals
    )
  }
  console.log(`  ${table}: ${rows.length}`)
}

const run = async () => {
  const schema = readFileSync(join(__dirname, '..', 'db', 'schema.sql'), 'utf8')
  console.log('Creating schema on target...')
  await pool.query(schema)
  console.log('Importing data (FK order)...')
  await insertAll('members', dump.members)
  await insertAll('customers', dump.customers)
  await insertAll('loans', dump.loans)
  await insertAll('entries', dump.entries)
  console.log('Migration complete.')
}

run().catch((e) => { console.error(e); process.exit(1) })
  .finally(() => pool.end())
