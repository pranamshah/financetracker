import { neon } from '@neondatabase/serverless'

// Shared Neon SQL client. Files prefixed with `_` are not routed by Vercel.
export const sql = neon(process.env.DATABASE_URL)

export function send(res, status, body) {
  res.setHeader('Content-Type', 'application/json')
  res.status(status).json(body)
}

export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string' && req.body) return JSON.parse(req.body)
  const chunks = []
  for await (const c of req) chunks.push(c)
  if (!chunks.length) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}
