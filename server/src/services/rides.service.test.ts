import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../db/pool';
import { createRidePost, deleteRidePost, listRidePosts, RidePostInput } from './rides.service';

const guestId = 'guest-authenticated';
const wedding = { id: guestId, wedding_id: 12, wedding_date: '2027-06-14' };

function validInput(overrides: Partial<RidePostInput> = {}): RidePostInput {
  return {
    kind: 'offer',
    display_name: 'דנה',
    contact_phone: '054 123-4567',
    origin_text: 'חיפה',
    time_from: '18:00',
    time_to: null,
    seats_available: 2,
    passenger_count: null,
    notes: null,
    ...overrides,
  };
}

function mockQueries(
  responses: Array<{ rows?: unknown[]; rowCount?: number }>,
  calls: Array<{ sql: string; values: unknown[] }>,
): void {
  pool.query = (async (sql: string, values: unknown[] = []) => {
    calls.push({ sql, values });
    const response = responses.shift();
    if (!response) throw new Error('Unexpected database query');
    return { rows: response.rows ?? [], rowCount: response.rowCount ?? response.rows?.length ?? 0 };
  }) as unknown as typeof pool.query;
}

test('createRidePost scopes a new post to the authenticated guest wedding', async () => {
  const originalQuery = pool.query;
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const inserted = {
    id: 'post-1',
    wedding_id: 12,
    creator_guest_id: guestId,
    kind: 'offer',
    display_name: 'דנה',
    contact_phone: '+972501234567',
    origin_text: 'חיפה',
    time_from: '18:00:00',
    time_to: null,
    seats_available: 2,
    passenger_count: null,
    notes: null,
    consented_at: '2027-06-01T10:00:00.000Z',
    status: 'active',
    created_at: '2027-06-01T10:00:00.000Z',
    updated_at: '2027-06-01T10:00:00.000Z',
    expires_at: '2027-06-15T00:00:00.000Z',
  };
  mockQueries([
    { rows: [wedding] },
    { rows: [{ can_publish: true }] },
    { rows: [inserted] },
  ], calls);

  try {
    const post = await createRidePost(guestId, validInput());
    assert.equal(post.is_mine, true);
    assert.equal(post.contact_phone, '+972501234567');
    assert.equal(post.whatsapp_url, null);
    assert.deepEqual(calls[0].values, [guestId]);
    assert.match(calls[2].sql, /SELECT \$1, \$2, \$3/);
    assert.deepEqual(calls[2].values.slice(0, 2), [12, guestId]);
    assert.equal(calls[2].values[4], '+972541234567');
  } finally {
    pool.query = originalQuery;
  }
});

test('listRidePosts scopes by server wedding and hides other guests phone numbers', async () => {
  const originalQuery = pool.query;
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const activeOffer = {
    id: 'other-offer', wedding_id: 12, creator_guest_id: 'guest-other', kind: 'offer',
    display_name: 'רוני', contact_phone: '+972501111111', origin_text: 'חיפה',
    time_from: '18:00:00', time_to: null, seats_available: 1, passenger_count: null,
    notes: null, consented_at: '2027-06-01T10:00:00.000Z', status: 'active',
    created_at: '2027-06-01T10:00:00.000Z', updated_at: '2027-06-01T10:00:00.000Z',
    expires_at: '2027-06-15T00:00:00.000Z',
  };
  const fullOffer = { ...activeOffer, id: 'full-offer', status: 'full' };
  mockQueries([{ rows: [wedding] }, {}, { rows: [activeOffer, fullOffer] }], calls);

  try {
    const posts = await listRidePosts(guestId);
    assert.deepEqual(calls[2].values, [12, guestId]);
    assert.match(calls[2].sql, /status IN \('active', 'full'\) OR creator_guest_id = \$2/);
    assert.equal(posts[0].contact_phone, null);
    assert.equal(posts[0].whatsapp_url?.startsWith('https://wa.me/972501111111?text='), true);
    assert.match(decodeURIComponent(posts[0].whatsapp_url ?? ''), /ראיתי את הצעת הנסיעה/);
    assert.equal(posts[1].status, 'full');
    assert.equal(posts[1].whatsapp_url, null);
  } finally {
    pool.query = originalQuery;
  }
});

test('createRidePost rejects malformed Israeli phone numbers before database access', async () => {
  const originalQuery = pool.query;
  let called = false;
  pool.query = (async () => {
    called = true;
    return { rows: [] };
  }) as unknown as typeof pool.query;
  try {
    await assert.rejects(
      createRidePost(guestId, validInput({ contact_phone: '123' })),
      (error: unknown) => (error as { statusCode?: number }).statusCode === 400,
    );
    assert.equal(called, false);
  } finally {
    pool.query = originalQuery;
  }
});

test('createRidePost normalizes international and trunk-prefixed Israeli phone numbers', async () => {
  const originalQuery = pool.query;
  const examples = [
    ['972548901877', '+972548901877'],
    ['+9720528719088', '+972528719088'],
  ];

  try {
    for (const [phone, expected] of examples) {
      const calls: Array<{ sql: string; values: unknown[] }> = [];
      mockQueries([
        { rows: [wedding] },
        { rows: [{ can_publish: true }] },
        { rows: [{
          id: 'post-1', wedding_id: 12, creator_guest_id: guestId, kind: 'offer',
          display_name: 'דנה', contact_phone: expected, origin_text: 'חיפה',
          time_from: '18:00:00', time_to: null, seats_available: 2,
          passenger_count: null, notes: null, consented_at: '2027-06-01T10:00:00.000Z',
          status: 'active', created_at: '2027-06-01T10:00:00.000Z',
          updated_at: '2027-06-01T10:00:00.000Z', expires_at: '2027-06-15T00:00:00.000Z',
        }] },
      ], calls);

      await createRidePost(guestId, validInput({ contact_phone: phone }));
      assert.equal(calls[2].values[4], expected);
    }
  } finally {
    pool.query = originalQuery;
  }
});

test('deleteRidePost includes owner and wedding in its delete predicate', async () => {
  const originalQuery = pool.query;
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  mockQueries([{ rows: [wedding] }, { rowCount: 0 }], calls);
  try {
    await assert.rejects(deleteRidePost(guestId, 'post-from-another-guest'), (error: unknown) => (
      (error as { statusCode?: number }).statusCode === 404
    ));
    assert.deepEqual(calls[1].values, ['post-from-another-guest', 12, guestId]);
    assert.match(calls[1].sql, /id = \$1 AND wedding_id = \$2 AND creator_guest_id = \$3/);
  } finally {
    pool.query = originalQuery;
  }
});