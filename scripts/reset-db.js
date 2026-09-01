// DANGER: drops all Finance Tracker tables, then recreates from schema.sql
// (and seeds when --seed is passed). Intended for dev / initial setup only.
// Usage: DATABASE_URL=... node scripts/reset-db.js --seed
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import 'dotenv/config'
import { Pool, neonConfig } from '@neondatabase/serverless'

neonConfig.webSocketConstructor = globalThis.WebSocket
const __dirname = dirname(fileURLToPath(import.meta.url))

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const run = async () => {
  console.log('Dropping existing tables ...')
  await pool.query(
    'drop table if exists entries, loans, customers, members, employees cascade'
  )
  const schema = readFileSync(join(__dirname, '..', 'db', 'schema.sql'), 'utf8')
  console.log('Recreating schema ...')
  await pool.query(schema)
  if (process.argv.includes('--seed')) {
    const seed = readFileSync(join(__dirname, '..', 'db', 'seed.sql'), 'utf8')
    console.log('Seeding ...')
    await pool.query(seed)
  }
  console.log('Database reset complete.')
}

run()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => pool.end())
