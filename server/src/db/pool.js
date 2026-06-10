import pg from 'pg';
import { env } from '../config/env.js';

// Connection pool: reuse connections instead of opening a new one per request
// (~50–100 ms overhead per new connection).
export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10,                      // Max connections (enough for a pet project)
  idleTimeoutMillis: 30_000,    // Close idle connections after 30 s
  connectionTimeoutMillis: 5_000,
});

// If a pooled connection dies (e.g. DB restarted), log it but do not crash —
// the pool will create a new connection.
pool.on('error', (err) => {
  console.error('[DB] Idle connection error:', err.message);
});
