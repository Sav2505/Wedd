import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../db/pool';
import { updateGuest } from './guests.service';

test('concurrent gift updates only write the field included in each request', async () => {
  const originalQuery = pool.query;
  const updates: Array<{ sql: string; values: unknown[] }> = [];
  const currentGuest = {
    first_name: 'דנה',
    last_name: 'כהן',
    full_name: 'דנה כהן',
    phone: '0501234567',
    side: null,
    guest_group_id: null,
    gift_amount: null,
    gift_kind: null,
  };

  pool.query = (async (sql: string, values?: unknown[]) => {
    if (sql.includes('UPDATE guests')) updates.push({ sql, values: values ?? [] });
    return { rows: [currentGuest] };
  }) as typeof pool.query;

  try {
    await Promise.all([
      updateGuest('guest-1', { gift_amount: 500 }),
      updateGuest('guest-1', { gift_kind: 'מזומן' }),
    ]);

    assert.equal(updates.length, 2);
    const amountUpdate = updates.find(({ sql }) => sql.includes('gift_amount ='));
    const kindUpdate = updates.find(({ sql }) => sql.includes('gift_kind ='));
    assert.ok(amountUpdate);
    assert.ok(kindUpdate);
    assert.doesNotMatch(amountUpdate.sql, /gift_kind\s*=/);
    assert.doesNotMatch(kindUpdate.sql, /gift_amount\s*=/);
  } finally {
    pool.query = originalQuery;
  }
});