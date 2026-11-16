import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../db/pool';
import { completeWhatsAppQuotaReservation, reserveWhatsAppQuota, reserveWhatsAppQuotaBatch, WhatsAppQuotaError } from './whatsappQuota.service';

test('reserves quota under a transaction-scoped lock', async () => {
  const originalConnect = pool.connect;
  const originalLimit = process.env.WHATSAPP_DAILY_MESSAGE_LIMIT;
  const queries: string[] = [];
  let released = false;
  delete process.env.WHATSAPP_DAILY_MESSAGE_LIMIT;
  pool.connect = (async () => ({
    query: async (sql: string) => {
      queries.push(sql);
      if (sql.includes('AS ready')) return { rows: [{ ready: true }] };
      if (sql.includes('COUNT(*)')) return { rows: [{ count: '249' }] };
      if (sql.includes('INSERT INTO')) return { rows: [{ id: '42' }] };
      return { rows: [] };
    },
    release: () => { released = true; },
  })) as unknown as typeof pool.connect;
  try {
    assert.equal(await reserveWhatsAppQuota('wedding_confirmation'), '42');
    assert.equal(queries[0], 'BEGIN');
    assert.match(queries[1], /pg_advisory_xact_lock/);
    assert.match(queries[3], /status = 'reserved'.*created_at/s);
    assert.match(queries[3], /status = 'unknown'.*completed_at/s);
    assert.match(queries[3], /INTERVAL '24 hours'/);
    assert.equal(queries.at(-1), 'COMMIT');
    assert.equal(released, true);
  } finally {
    pool.connect = originalConnect;
    if (originalLimit === undefined) delete process.env.WHATSAPP_DAILY_MESSAGE_LIMIT;
    else process.env.WHATSAPP_DAILY_MESSAGE_LIMIT = originalLimit;
  }
});

test('rolls back when quota is exhausted or the transition is incomplete', async () => {
  const originalConnect = pool.connect;
  const originalLimit = process.env.WHATSAPP_DAILY_MESSAGE_LIMIT;
  delete process.env.WHATSAPP_DAILY_MESSAGE_LIMIT;
  try {
    for (const ready of [true, false]) {
      const queries: string[] = [];
      pool.connect = (async () => ({
        query: async (sql: string) => {
          queries.push(sql);
          if (sql.includes('AS ready')) return { rows: [{ ready }] };
          if (sql.includes('COUNT(*)')) return { rows: [{ count: '250' }] };
          return { rows: [] };
        },
        release: () => undefined,
      })) as unknown as typeof pool.connect;
      await assert.rejects(reserveWhatsAppQuota('wedding_reminder'), WhatsAppQuotaError);
      assert.equal(queries.at(-1), 'ROLLBACK');
      assert.equal(queries.some((sql) => sql.includes('INSERT INTO')), false);
    }
  } finally {
    pool.connect = originalConnect;
    if (originalLimit === undefined) delete process.env.WHATSAPP_DAILY_MESSAGE_LIMIT;
    else process.env.WHATSAPP_DAILY_MESSAGE_LIMIT = originalLimit;
  }
});

test('completes only an existing reserved quota entry', async () => {
  const calls: unknown[][] = [];
  const client = {
    query: async (_sql: string, values: unknown[]) => {
      calls.push(values);
      return { rowCount: 1 };
    },
  } as unknown as Parameters<typeof completeWhatsAppQuotaReservation>[3];
  await completeWhatsAppQuotaReservation('42', 'accepted', 'wamid.1', client);
  assert.deepEqual(calls, [['42', 'accepted', 'wamid.1']]);
});

test('reserves an entire group or none of it', async () => {
  const originalConnect = pool.connect;
  const originalLimit = process.env.WHATSAPP_DAILY_MESSAGE_LIMIT;
  delete process.env.WHATSAPP_DAILY_MESSAGE_LIMIT;
  let used = 248;
  const queries: string[] = [];
  pool.connect = (async () => ({
    query: async (sql: string, values?: unknown[]) => {
      queries.push(sql);
      if (sql.includes('AS ready')) return { rows: [{ ready: true }] };
      if (sql.includes('COUNT(*)')) return { rows: [{ count: String(used) }] };
      if (sql.includes('INSERT INTO')) {
        assert.deepEqual(values, ['wedding_reminder', 2]);
        return { rows: [{ id: '1' }, { id: '2' }] };
      }
      return { rows: [] };
    },
    release: () => undefined,
  })) as unknown as typeof pool.connect;
  try {
    assert.deepEqual(await reserveWhatsAppQuotaBatch('wedding_reminder', 2), ['1', '2']);
    used = 249;
    queries.length = 0;
    await assert.rejects(reserveWhatsAppQuotaBatch('wedding_reminder', 2), WhatsAppQuotaError);
    assert.equal(queries.some((sql) => sql.includes('INSERT INTO')), false);
    await assert.rejects(reserveWhatsAppQuotaBatch('wedding_reminder', 251), WhatsAppQuotaError);
    assert.deepEqual(await reserveWhatsAppQuotaBatch('wedding_reminder', 0), []);
  } finally {
    pool.connect = originalConnect;
    if (originalLimit === undefined) delete process.env.WHATSAPP_DAILY_MESSAGE_LIMIT;
    else process.env.WHATSAPP_DAILY_MESSAGE_LIMIT = originalLimit;
  }
});