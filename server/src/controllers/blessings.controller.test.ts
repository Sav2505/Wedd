import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Request, Response } from 'express';
import { pool } from '../db/pool';
import { getBlessings, getMyBlessing, saveMyBlessing } from './guests.controller';

test('blessings validate content and use authenticated identities', async () => {
  const originalQuery = pool.query;
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const row = { id: 'guest-1', full_name: 'Guest', blessing: 'Good wishes', blessing_updated_at: null };
  pool.query = (async (sql: string, values: unknown[]) => {
    calls.push({ sql, values });
    return { rows: [row] };
  }) as typeof pool.query;
  let result: unknown;
  let error: unknown;
  const response = { json: (value: unknown) => { result = value; } } as Response;
  const next = (value?: unknown) => { error = value; };
  try {
    for (const blessing of [undefined, null, 42, '', '  \n ', 'a'.repeat(2001)]) {
      error = undefined;
      await saveMyBlessing({ body: { blessing }, guestId: 'guest-1' } as unknown as Request, response, next);
      assert.equal((error as { statusCode: number }).statusCode, 400);
    }
    assert.equal(calls.length, 0);
    await saveMyBlessing({ body: { blessing: '  Good wishes  ', guestId: 'other' }, guestId: 'guest-1' } as unknown as Request, response, next);
    assert.deepEqual(calls[0].values, ['guest-1', 'Good wishes']);
    assert.match(calls[0].sql, /role = 'guest'/);
    assert.deepEqual(result, { success: true, data: row });
    await getMyBlessing({ guestId: 'guest-1' } as unknown as Request, response, next);
    assert.deepEqual(calls[1].values, ['guest-1']);
    await getBlessings({ coupleId: 'couple-1', query: { wedding_id: '999' } } as unknown as Request, response, next);
    assert.deepEqual(calls[2].values, ['couple-1']);
    assert.match(calls[2].sql, /couple.wedding_id = g.wedding_id/);
    assert.match(calls[2].sql, /couple.role = 'couple'/);
  } finally {
    pool.query = originalQuery;
  }
});