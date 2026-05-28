/**
 * migrate.ts — run schema.sql then seed.sql against the configured database.
 *
 * Usage (from the server/ directory):
 *   npx ts-node src/db/migrate.ts
 */

import path from 'path';
import fs from 'fs';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ─── Build connection config ────────────────────────────────
const connectionString = process.env.DATABASE_URL;
const pool = new Pool(
  connectionString
    ? { connectionString, connectionTimeoutMillis: 8_000 }
    : {
        host:     process.env.PG_HOST,
        port:     Number(process.env.PG_PORT ?? 5432),
        database: process.env.PG_DATABASE,
        user:     process.env.PG_USER,
        password: process.env.PG_PASSWORD,
        connectionTimeoutMillis: 8_000,
      },
);

// ─── Run a SQL file inside a single transaction ────────────
async function runSqlFile(filePath: string): Promise<void> {
  const label = path.basename(filePath);
  const sql   = fs.readFileSync(filePath, 'utf8');

  const client = await pool.connect();
  try {
    console.log(`\n▶  Running ${label} ...`);
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log(`✓  ${label} — done`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw new Error(`✗  ${label} failed: ${(err as Error).message}`);
  } finally {
    client.release();
  }
}

// ─── Main ───────────────────────────────────────────────────
async function migrate(): Promise<void> {
  const dbDir = path.resolve(__dirname, '../../../database');

  // Verify DB connection first
  console.log('\n🔌  Testing database connection...');
  const client = await pool.connect();
  const { rows } = await client.query<{ version: string }>('SELECT version()');
  console.log(`✓  Connected: ${rows[0].version.split(',')[0]}`);
  client.release();

  await runSqlFile(path.join(dbDir, 'schema.sql'));
  await runSqlFile(path.join(dbDir, 'seed.sql'));

  console.log('\n🎉  Migration complete!\n');
  await pool.end();
}

migrate().catch((err) => {
  console.error('\n' + (err as Error).message);
  process.exit(1);
});
