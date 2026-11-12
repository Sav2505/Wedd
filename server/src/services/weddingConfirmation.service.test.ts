import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../db/pool';
import { sendConfirmationForCouple, sendWeddingConfirmation } from './weddingConfirmation.service';

const wedding = {
  id: 12, bride_name: 'רונה', groom_name: 'יואב', wedding_date: '2027-06-14',
  wedding_time: '19:30:00', wedding_canpoy_time: '20:30:00', venue_name: 'גן',
  venue_address: 'תל אביב', whatsapp_owner_confirmed: true, invitation_image_media_id: 'image-1',
};
const guest = { id: 'guest-1', full_name: 'רוני כהן', first_name: 'רוני', phone: '0501234567' };

test('confirmation sends the template once and records its result', async () => {
  const originalQuery = pool.query;
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  let status: string | null = null;
  let sends = 0;
  let sentMessageId: unknown;
  let payload: any;
  pool.query = (async (sql: string, values: unknown[] = []) => {
    if (sql.includes('pg_constraint')) return { rows: [{ needsUpdate: false }] };
    if (sql.includes('FROM guests couple')) {
      assert.deepEqual(values, ['couple-1', guest.id]);
      return { rows: [{ ...wedding, ...guest, id: wedding.id, guest_id: guest.id }] };
    }
    if (sql.includes('INSERT INTO wedding_message_log')) {
      assert.match(sql, /WHERE \$3::boolean OR wedding_message_log.status = 'failed'/);
      if (!values[2] && status && status !== 'failed') return { rows: [] };
      status = 'pending';
      return { rows: [{ id: 1, attempt_count: 1 }] };
    }
    if (sql.includes("SET status = 'sent'")) { status = 'sent'; sentMessageId = values[0]; return { rows: [] }; }
    if (sql.includes("SET status = 'failed'")) { status = 'failed'; return { rows: [] }; }
    throw new Error(`Unexpected query: ${sql}`);
  }) as typeof pool.query;
  process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone-id';
  process.env.WHATSAPP_ACCESS_TOKEN = 'token';
  process.env.GUEST_PORTAL_BASE_URL = 'https://example.test';
  process.env.WHATSAPP_TEST_ONLY = 'false';
  globalThis.fetch = (async (_url, init) => {
    sends += 1;
    payload = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ messages: [{ id: 'meta-1' }] }), { status: 200 });
  }) as typeof fetch;
  try {
    const results = await Promise.all([sendWeddingConfirmation(wedding, guest), sendWeddingConfirmation(wedding, guest)]);
    assert.deepEqual(results.sort(), [false, true]);
    assert.equal(sends, 1);
    assert.equal(status, 'sent');
    assert.equal(sentMessageId, 'meta-1');
    assert.equal(payload.template.name, 'wedding_confirmation');
    assert.equal(payload.template.language.code, 'he');
    const [header, body, button] = payload.template.components;
    assert.equal(header.parameters[0].image.id, 'image-1');
    assert.deepEqual(body.parameters.map((item: any) => item.text).slice(0, 1), ['רוני']);
    assert.deepEqual(body.parameters.map((item: any) => item.text).slice(2), ['19:30', '20:30', 'רונה & יואב']);
    assert.ok(body.parameters[1].text.includes('2027'));
    const url = new URL(button.parameters[0].text);
    assert.equal(url.searchParams.get('n'), guest.full_name);
    assert.equal(url.searchParams.get('p'), '4567');
    assert.equal(url.searchParams.get('w'), '12');
    assert.equal(url.searchParams.get('t'), '5');
    assert.equal(await sendWeddingConfirmation(wedding, guest), false);
    assert.equal(await sendWeddingConfirmation(wedding, guest, true), true);
    assert.equal(sends, 2);
    for (const previousStatus of ['pending', 'sent', 'delivered', 'read', 'failed']) {
      status = previousStatus;
      await sendConfirmationForCouple('couple-1', guest.id);
      assert.equal(status, 'sent');
    }
    assert.equal(sends, 7);

    status = null;
    globalThis.fetch = (async () => new Response(JSON.stringify({ error: { message: 'Rejected' } }), { status: 400 })) as typeof fetch;
    await assert.rejects(sendWeddingConfirmation(wedding, guest), /ניתן לנסות שוב/);
    assert.equal(status, 'failed');
    globalThis.fetch = (async () => { throw new Error('network error'); }) as typeof fetch;
    await assert.rejects(sendWeddingConfirmation(wedding, guest), /אינה ידועה/);
    assert.equal(status, 'pending');
    assert.equal(await sendWeddingConfirmation(wedding, guest), false);
    globalThis.fetch = (async () => new Response(JSON.stringify({ messages: [{ id: 'meta-2' }] }), { status: 200 })) as typeof fetch;
    assert.equal(await sendWeddingConfirmation(wedding, guest, true), true);
    assert.equal(status, 'sent');

    await assert.rejects(sendWeddingConfirmation({ ...wedding, whatsapp_owner_confirmed: false }, guest), /לאשר שימוש/);
    await assert.rejects(sendWeddingConfirmation({ ...wedding, invitation_image_media_id: null }, guest), /תמונת הזמנה/);
    process.env.WHATSAPP_TEST_ONLY = 'true';
    await assert.rejects(sendWeddingConfirmation(wedding, guest), /מצב בדיקה/);
  } finally {
    pool.query = originalQuery;
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test('confirmation checks the guest against the couple wedding', async () => {
  const originalQuery = pool.query;
  pool.query = (async (sql: string, values: unknown[]) => {
    assert.match(sql, /g.wedding_id = wi.id/);
    assert.match(sql, /couple.role = 'couple'/);
    assert.match(sql, /g.role = 'guest'/);
    assert.deepEqual(values, ['couple-1', 'other-guest']);
    return { rows: [] };
  }) as typeof pool.query;
  try {
    await assert.rejects(sendConfirmationForCouple('couple-1', 'other-guest'), /לא נמצא/);
  } finally {
    pool.query = originalQuery;
  }
});