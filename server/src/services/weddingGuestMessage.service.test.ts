import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../db/pool';
import { sendWeddingTemplateForCouple } from './weddingGuestMessage.service';

const messageRow = {
  wedding_id: 12,
  bride_name: 'רונה',
  groom_name: 'יואב',
  wedding_date: '2027-06-14',
  wedding_time: '19:30:00',
  wedding_canpoy_time: '20:30:00',
  venue_name: 'גן האירועים',
  venue_address: 'תל אביב',
  whatsapp_owner_confirmed: true,
  invitation_image_media_id: 'image-1',
  guest_id: 'guest-1',
  full_name: 'רוני כהן',
  first_name: 'רוני',
  phone: '0501234567',
  rsvp_status: 'PENDING',
};

test('manual reminder sends the selected template with live wedding data and the guest URL', async () => {
  const originalQuery = pool.query;
  const originalConnect = pool.connect;
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  const queries: Array<{ sql: string; values: unknown[] }> = [];
  let payload: any;
  process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone-id';
  process.env.WHATSAPP_ACCESS_TOKEN = 'token';
  process.env.WHATSAPP_TEST_ONLY = 'false';
  process.env.GUEST_PORTAL_BASE_URL = 'https://guest.example';
  pool.query = (async (sql: string, values: unknown[] = []) => {
    queries.push({ sql, values });
    if (sql.includes('pg_constraint')) return { rows: [{ needsUpdate: false }] };
    if (sql.includes('FROM guests couple')) return { rows: [messageRow] };
    if (sql.includes('INSERT INTO wedding_message_log')) return { rows: [{ id: 8, attempt_count: 1 }] };
    if (sql.includes('UPDATE whatsapp_quota_reservations')) return { rows: [], rowCount: 1 };
    if (sql.includes("SET status = 'sent'")) return { rows: [], rowCount: 1 };
    throw new Error(`Unexpected query: ${sql}`);
  }) as unknown as typeof pool.query;
  pool.connect = (async () => ({
    query: async (sql: string) => {
      if (sql.includes('AS ready')) return { rows: [{ ready: true }] };
      if (sql.includes('COUNT(*)')) return { rows: [{ count: '0' }] };
      if (sql.includes('INSERT INTO whatsapp_quota_reservations')) return { rows: [{ id: '42' }] };
      return { rows: [] };
    },
    release: () => undefined,
  })) as unknown as typeof pool.connect;
  globalThis.fetch = (async (_url, init) => {
    payload = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ messages: [{ id: 'wamid.1' }] }), { status: 200 });
  }) as typeof fetch;
  try {
    await sendWeddingTemplateForCouple('couple-1', 'guest-1', 'wedding_reminder');
    assert.equal(payload.template.name, 'wedding_reminder');
    assert.deepEqual(payload.template.components[0].parameters.map((parameter: { text: string }) => parameter.text).slice(0, 1), ['רוני']);
    assert.match(payload.template.components[0].parameters[1].text, /2027/);
    assert.deepEqual(payload.template.components[0].parameters.map((parameter: { text: string }) => parameter.text).slice(2), [
      '19:30', '20:30', 'רונה & יואב',
    ]);
    const url = new URL(payload.template.components[1].parameters[0].text);
    assert.equal(url.searchParams.get('n'), 'רוני כהן');
    assert.equal(url.searchParams.get('p'), '4567');
    assert.equal(url.searchParams.get('w'), '12');
    assert.equal(url.searchParams.get('t'), '5');
    assert.ok(queries.some((query) => query.sql.includes('INSERT INTO wedding_message_log')));
  } finally {
    pool.query = originalQuery;
    pool.connect = originalConnect;
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test('manual reminder rejects a guest who already responded before calling WhatsApp', async () => {
  const originalQuery = pool.query;
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  let sends = 0;
  process.env.WHATSAPP_TEST_ONLY = 'false';
  pool.query = (async (sql: string) => {
    if (sql.includes('FROM guests couple')) return { rows: [{ ...messageRow, rsvp_status: 'COMING' }] };
    throw new Error(`Unexpected query: ${sql}`);
  }) as unknown as typeof pool.query;
  globalThis.fetch = (async () => { sends += 1; throw new Error('must not send'); }) as typeof fetch;
  try {
    await assert.rejects(sendWeddingTemplateForCouple('couple-1', 'guest-1', 'wedding_reminder'), /רק לאורח שעדיין ממתין/);
    assert.equal(sends, 0);
  } finally {
    pool.query = originalQuery;
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test('test-mode direct send targets the selected guest phone and writes no delivery or quota rows', async () => {
  const originalQuery = pool.query;
  const originalConnect = pool.connect;
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  let payload: any;
  process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone-id';
  process.env.WHATSAPP_ACCESS_TOKEN = 'token';
  delete process.env.WHATSAPP_TEST_PHONE;
  process.env.WHATSAPP_TEST_ONLY = 'false';
  pool.query = (async (sql: string) => {
    if (sql.includes('FROM guests couple')) return { rows: [{ ...messageRow, rsvp_status: 'COMING' }] };
    throw new Error(`Test mode must not write delivery logs: ${sql}`);
  }) as unknown as typeof pool.query;
  pool.connect = (async () => { throw new Error('Test mode must not reserve quota'); }) as unknown as typeof pool.connect;
  globalThis.fetch = (async (_url, init) => {
    payload = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ messages: [{ id: 'wamid.test' }] }), { status: 200 });
  }) as typeof fetch;
  try {
    await sendWeddingTemplateForCouple('couple-1', 'guest-1', 'wedding_reminder', true);
    assert.equal(payload.template.name, 'wedding_reminder');
    assert.equal(payload.to, '972501234567');
  } finally {
    pool.query = originalQuery;
    pool.connect = originalConnect;
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});

