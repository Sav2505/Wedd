import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../db/pool';
import { createGuestMessageRequest } from './guestCustomMessage.service';

const coupleId = 'couple-authenticated';
const input = {
  audience: 'COMING' as const,
  message_body: 'נשמח לראותכם',
  scheduled_at: '2027-06-14T10:00:00.000Z',
};

function mockQueries(
  responses: Array<{ rows: unknown[] }>,
  calls: Array<{ sql: string; values: unknown[] }>,
): void {
  pool.query = (async (sql: string, values: unknown[] = []) => {
    calls.push({ sql, values });
    const response = responses.shift();
    if (!response) throw new Error('Unexpected database query');
    return { rows: response.rows, rowCount: response.rows.length };
  }) as unknown as typeof pool.query;
}

test('createGuestMessageRequest rejects a wedding outside the authenticated couple scope', async () => {
  const originalQuery = pool.query;
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  mockQueries([{ rows: [{ wedding_id: 12 }] }], calls);

  try {
    await assert.rejects(
      createGuestMessageRequest(coupleId, 13, input),
      (error: unknown) => (error as { statusCode?: number }).statusCode === 403,
    );
    assert.equal(calls.length, 1);
  } finally {
    pool.query = originalQuery;
  }
});

test('createGuestMessageRequest stores a scoped request and reports unavailable admin email', async () => {
  const originalQuery = pool.query;
  const originalAdminMail = process.env.WEDFLOW_ADMIN_MAIL;
  const originalEmailAdmin = process.env.EMAIL_ADMIN;
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  mockQueries([
    { rows: [{ wedding_id: 12 }] },
    { rows: [{ id: 'request-1', wedding_id: 12, ...input }] },
  ], calls);
  process.env.WEDFLOW_ADMIN_MAIL = '';
  process.env.EMAIL_ADMIN = '';

  try {
    const result = await createGuestMessageRequest(coupleId, 12, input);
    assert.equal(result.request.id, 'request-1');
    assert.equal(result.admin_notification_sent, false);
    assert.deepEqual(calls[1].values, [12, coupleId, 'COMING', input.message_body, input.scheduled_at]);
  } finally {
    pool.query = originalQuery;
    if (originalAdminMail === undefined) delete process.env.WEDFLOW_ADMIN_MAIL;
    else process.env.WEDFLOW_ADMIN_MAIL = originalAdminMail;
    if (originalEmailAdmin === undefined) delete process.env.EMAIL_ADMIN;
    else process.env.EMAIL_ADMIN = originalEmailAdmin;
  }
});