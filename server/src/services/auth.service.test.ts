import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../db/pool';
import { loginGuest } from './auth.service';

test('RSVP link login returns complete RSVP data in the authentication query', async () => {
  const original = pool.query;
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const initialRsvp = {
    id: 'guest-a', rsvp_status: 'COMING', number_of_guests: 3,
    rsvp_updated_at: null, vegetarian_count: 1, vegan_count: 1,
    regular_count: 1, requested_dish_type: null, dish_notes: 'No nuts',
  };
  pool.query = (async (sql: string, values: unknown[]) => {
    calls.push({ sql, values });
    return { rows: [{ id: 'guest-a', role: 'guest', initial_rsvp: initialRsvp }] };
  }) as typeof pool.query;
  try {
    const result = await loginGuest(' Guest Name ', '1234', 7, true);
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].values, ['Guest Name', '1234', 7]);
    assert.match(calls[0].sql, /wedding_id = \$3/);
    assert.match(calls[0].sql, /RIGHT\(phone, 4\) = \$2/);
    for (const field of Object.keys(initialRsvp)) {
      assert.ok(calls[0].sql.includes(`'${field}'`));
    }
    assert.deepEqual(result.initial_rsvp, initialRsvp);
  } finally { pool.query = original; }
});

test('normal login does not request RSVP details', async () => {
  const original = pool.query;
  pool.query = (async (sql: string) => {
    assert.doesNotMatch(sql, /json_build_object|dish_notes|vegetarian_count/);
    return { rows: [{ id: 'guest-a', role: 'guest' }] };
  }) as typeof pool.query;
  try {
    const result = await loginGuest('Guest Name', '1234', 7);
    assert.equal(result.initial_rsvp, undefined);
  } finally { pool.query = original; }
});