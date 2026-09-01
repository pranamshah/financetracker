// Run schema.sql (and optionally seed.sql) against your Neon database.
// Usage: DATABASE_URL=... node scripts/setup-db.js [--seed]
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const __dirname = dirname(fileURLToPath(import.meta.url))

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Add it to .env or your shell.')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)

async function runFile(name) {
  const text = readFileSync(join(__dirname, '..', 'db', name), 'utf8')
  console.log(`Running ${name} ...`)
  await sql.query(text)
  console.log(`  done: ${name}`)
}

const run = async () => {
  await runFile('schema.sql')
  if (process.argv.includes('--seed')) await runFile('seed.sql')
  console.log('Database setup complete.')
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
