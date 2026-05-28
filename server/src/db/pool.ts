import { Pool, types } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// ─── Prevent timezone-shift bugs ─────────────────────────────
// By default node-postgres parses DATE/TIME into JS Date objects
// using UTC, which shifts dates when the server runs in UTC+2/+3.
// Returning raw strings avoids the off-by-one-day problem.
types.setTypeParser(1082, (val: string) => val); // DATE  → "YYYY-MM-DD"
types.setTypeParser(1083, (val: string) => val); // TIME  → "HH:MM:SS"
types.setTypeParser(1114, (val: string) => val); // TIMESTAMP (no tz) → string


const hasConnectionString = Boolean(process.env.DATABASE_URL);
const hasIndividualVars =
  process.env.PG_HOST &&
  process.env.PG_PORT &&
  process.env.PG_DATABASE &&
  process.env.PG_USER &&
  process.env.PG_PASSWORD;

if (!hasConnectionString && !hasIndividualVars) {
  throw new Error(
    'DB config missing: set DATABASE_URL or PG_HOST/PG_PORT/PG_DATABASE/PG_USER/PG_PASSWORD',
  );
}

export const pool = new Pool(
  hasConnectionString
    ? {
        connectionString: process.env.DATABASE_URL,
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
      }
    : {
        host: process.env.PG_HOST,
        port: Number(process.env.PG_PORT),
        database: process.env.PG_DATABASE,
        user: process.env.PG_USER,
        password: process.env.PG_PASSWORD,
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
      },
);

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

