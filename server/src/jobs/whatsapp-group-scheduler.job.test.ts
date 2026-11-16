import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DateTime } from 'luxon';
import { pool } from '../db/pool';

test('a group is paused without sending when the whole group does not fit the quota', async () => {
  const originalConnect = pool.connect;
  const originalQuery = pool.query;
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  const updates: Array<{ sql: string; values: unknown[] }> = [];
  let sends = 0;
  process.env.IS_PROD = 'true';
  process.env.WHATSAPP_TEST_ONLY = 'false';
  process.env.WHATSAPP_DAILY_MESSAGE_LIMIT = '250';
  const weddingDate = DateTime.now().setZone('Asia/Jerusalem').plus({ days: 10 }).toISODate();
  const wedding = {
    id: 12, wedding_id: 12, bride_name: 'רונה', groom_name: 'יואב', wedding_date: weddingDate,
    wedding_time: '19:30', wedding_canpoy_time: '20:30', venue_name: 'גן', venue_address: 'תל אביב',
    whatsapp_owner_confirmed: true, invitation_days_before: 30, reminder_days_before: 14,
    day_before_offset_days: 1, invitation_locked_at: null, reminder_locked_at: null,
    day_before_locked_at: null, post_thanks_locked_at: null,
    invitation_image: null, invitation_image_mime_type: null, invitation_image_filename: null,
    invitation_image_media_id: null,
  };
  const guest = { id: 'guest-1', full_name: 'רוני כהן', first_name: 'רוני', last_name: 'כהן', phone: '0501234567', rsvp_status: 'PENDING' };
  pool.connect = (async () => ({
    query: async (sql: string) => {
      if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked: true }] };
      if (sql.includes("status = 'scheduled' FOR UPDATE")) return { rows: [{}] };
      if (sql.includes('LEFT JOIN wedding_message_log')) return { rows: [guest] };
      if (sql.includes('AS ready')) return { rows: [{ ready: true }] };
      if (sql.includes('COUNT(*)')) return { rows: [{ count: '250' }] };
      if (sql.includes('INSERT INTO whatsapp_quota_reservations')) throw new Error('quota must not be reserved');
      return { rows: [] };
    },
    release: () => undefined,
  })) as unknown as typeof pool.connect;
  pool.query = (async (sql: string, values: unknown[] = []) => {
    updates.push({ sql, values });
    if (sql.includes('JOIN wedding_message_schedule s')) return { rows: [wedding] };
    if (sql.includes('FROM wedding_whatsapp_group_schedule WHERE status')) return { rows: [{
      id: '1', wedding_id: 12, guest_group_id: 'group-1', template_name: 'wedding_reminder', scheduled_at: new Date(),
    }] };
    return { rows: [] };
  }) as unknown as typeof pool.query;
  globalThis.fetch = (async () => { sends += 1; throw new Error('unexpected send'); }) as typeof fetch;
  try {
    const { runWhatsappGroupSchedulerOnce } = await import('./whatsapp-scheduler.job.js');
    await runWhatsappGroupSchedulerOnce();
    assert.equal(sends, 0);
    assert.ok(updates.some((call) => call.sql.includes('status = $2') && call.values[1] === 'paused_quota'));
  } finally {
    pool.connect = originalConnect;
    pool.query = originalQuery;
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test('a due group uses its reserved quota and records a successful send', async () => {
  const originalConnect = pool.connect;
  const originalQuery = pool.query;
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  const queries: Array<{ sql: string; values: unknown[] }> = [];
  let sends = 0;
  process.env.IS_PROD = 'true';
  process.env.WHATSAPP_TEST_ONLY = 'false';
  process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone-id';
  process.env.WHATSAPP_ACCESS_TOKEN = 'token';
  const wedding = {
    id: 12, wedding_id: 12, bride_name: 'רונה', groom_name: 'יואב',
    wedding_date: DateTime.now().setZone('Asia/Jerusalem').plus({ days: 10 }).toISODate(),
    wedding_time: '19:30', wedding_canpoy_time: '20:30', venue_name: 'גן', venue_address: 'תל אביב',
    whatsapp_owner_confirmed: true, invitation_days_before: 30, reminder_days_before: 14,
    day_before_offset_days: 1, invitation_locked_at: null, reminder_locked_at: null,
    day_before_locked_at: null, post_thanks_locked_at: null, invitation_image: null,
    invitation_image_mime_type: null, invitation_image_filename: null, invitation_image_media_id: null,
  };
  const guest = { id: 'guest-1', full_name: 'רוני כהן', first_name: 'רוני', last_name: 'כהן', phone: '0501234567', rsvp_status: 'PENDING' };
  pool.connect = (async () => ({
    query: async (sql: string, values: unknown[] = []) => {
      queries.push({ sql, values });
      if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked: true }] };
      if (sql.includes("status = 'scheduled' FOR UPDATE")) return { rows: [{}] };
      if (sql.includes('LEFT JOIN wedding_message_log')) return { rows: [guest] };
      if (sql.includes('AS ready')) return { rows: [{ ready: true }] };
      if (sql.includes('COUNT(*)')) return { rows: [{ count: '249' }] };
      if (sql.includes('INSERT INTO whatsapp_quota_reservations')) return { rows: [{ id: '42' }] };
      if (sql.includes('INSERT INTO wedding_whatsapp_group_deliveries')) return { rows: [{ id: '99' }] };
      return { rows: [] };
    },
    release: () => undefined,
  })) as unknown as typeof pool.connect;
  pool.query = (async (sql: string, values: unknown[] = []) => {
    queries.push({ sql, values });
    if (sql.includes('JOIN wedding_message_schedule s')) return { rows: [wedding] };
    if (sql.includes('FROM wedding_whatsapp_group_schedule WHERE status')) return { rows: [{
      id: '1', wedding_id: 12, guest_group_id: 'group-1', template_name: 'wedding_reminder', scheduled_at: new Date(),
    }] };
    if (sql.includes('SELECT g.phone, wi.whatsapp_owner_confirmed')) return { rows: [{ phone: guest.phone, whatsapp_owner_confirmed: true, eligible: true }] };
    if (sql.includes('pg_constraint')) return { rows: [{ needsUpdate: false }] };
    if (sql.includes('INSERT INTO wedding_message_log')) return { rows: [{ id: 100, attempt_count: 1 }] };
    return { rows: [], rowCount: 1 };
  }) as unknown as typeof pool.query;
  globalThis.fetch = (async () => {
    sends += 1;
    return new Response(JSON.stringify({ messages: [{ id: 'wamid.1' }] }), { status: 200 });
  }) as typeof fetch;
  try {
    const { runWhatsappGroupSchedulerOnce } = await import('./whatsapp-scheduler.job.js');
    await runWhatsappGroupSchedulerOnce();
    assert.equal(sends, 1);
    assert.ok(queries.some((call) => call.sql.includes("d.status = 'sending'") && call.sql.includes("status = 'unknown'")));
    assert.ok(queries.some((call) => call.sql.includes('UPDATE whatsapp_quota_reservations') && call.values[0] === '42' && call.values[1] === 'accepted'));
    assert.ok(queries.some((call) => call.sql.includes("SET status = 'completed'") && call.values[0] === '1'));
    queries.length = 0;
    sends = 0;
    globalThis.fetch = (async () => {
      sends += 1;
      return new Response(JSON.stringify({ error: { message: 'server error' } }), { status: 500 });
    }) as typeof fetch;
    await runWhatsappGroupSchedulerOnce();
    assert.equal(sends, 1);
    assert.ok(queries.some((call) => call.sql.includes('UPDATE whatsapp_quota_reservations') && call.values[1] === 'unknown'));
    assert.ok(queries.some((call) => call.sql.includes('UPDATE wedding_whatsapp_group_schedule SET status = $2') && call.values[1] === 'paused_error'));
  } finally {
    pool.connect = originalConnect;
    pool.query = originalQuery;
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});