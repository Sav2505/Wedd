import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../db/pool';
import { expireRidePostsOnce } from './ride-expiration.job';

test('expiration removes contact details immediately and purges rows after seven days', async () => {
  const originalQuery = pool.query;
  const calls: string[] = [];
  pool.query = (async (sql: string) => {
    calls.push(sql);
    return { rows: [], rowCount: 0 };
  }) as typeof pool.query;
  try {
    await expireRidePostsOnce();
    assert.match(calls[0], /status = 'expired', contact_phone = NULL/);
    assert.match(calls[0], /expires_at <= NOW\(\)/);
    assert.match(calls[1], /expires_at <= NOW\(\) - INTERVAL '7 days'/);
  } finally {
    pool.query = originalQuery;
  }
});