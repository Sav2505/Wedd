import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Request, Response } from 'express';
import { pool } from '../db/pool';
import { updateMyRsvp } from './guests.controller';

test('RSVP meal counts are validated and retained for non-coming statuses', async () => {
  const originalQuery = pool.query;
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const row = {
    id: 'guest-1',
    rsvp_status: 'NOT_COMING',
    number_of_guests: 3,
    rsvp_updated_at: null,
    vegetarian_count: 1,
    vegan_count: 1,
    regular_count: 1,
    requested_dish_type: null,
    dish_notes: 'Please keep the dishes separate',
  };
  pool.query = (async (sql: string, values: unknown[]) => {
    calls.push({ sql, values });
    return { rows: [row] };
  }) as typeof pool.query;

  let result: unknown;
  let error: unknown;
  const response = { json: (value: unknown) => { result = value; } } as Response;
  const next = (value?: unknown) => { error = value; };
  const request = (body: unknown) => ({ body, guestId: 'guest-1' }) as unknown as Request;

  try {
    for (const body of [
      { rsvp_status: 'COMING', number_of_guests: 2, vegetarian_count: 2, vegan_count: 1 },
      { rsvp_status: 'COMING', number_of_guests: 3, vegetarian_count: -1, vegan_count: 0 },
      { rsvp_status: 'COMING', number_of_guests: 3, vegetarian_count: 1.5, vegan_count: 0 },
    ]) {
      error = undefined;
      await updateMyRsvp(request(body), response, next);
      assert.equal((error as { statusCode: number }).statusCode, 400);
    }
    assert.equal(calls.length, 0);

    error = undefined;
    await updateMyRsvp(request({
      rsvp_status: 'NOT_COMING',
      number_of_guests: 3,
      vegetarian_count: 1,
      vegan_count: 1,
      dish_notes: 'Please keep the dishes separate',
    }), response, next);

    assert.equal(error, undefined);
    assert.deepEqual(calls[0].values, [
      'NOT_COMING', 3, 'guest-1', 1, 1, null, 'Please keep the dishes separate',
    ]);
    assert.match(calls[0].sql, /number_of_guests = \$2/);
    assert.deepEqual(result, { success: true, data: row });
  } finally {
    pool.query = originalQuery;
  }
});