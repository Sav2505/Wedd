import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../db/pool';
import { sendTemplateMessage, sendTemplateMessageWithRetry } from './whatsapp.service';

const payload = { to: '0501234567', templateName: 'wedding_reminder' };

test('blocks a send when the rolling quota is full', async () => {
  const originalConnect = pool.connect;
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  let sends = 0;
  process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone-id';
  process.env.WHATSAPP_ACCESS_TOKEN = 'token';
  pool.connect = (async () => ({
    query: async (sql: string) => {
      if (sql.includes('AS ready')) return { rows: [{ ready: true }] };
      if (sql.includes('COUNT(*)')) return { rows: [{ count: '250' }] };
      return { rows: [] };
    },
    release: () => undefined,
  })) as unknown as typeof pool.connect;
  globalThis.fetch = (async () => {
    sends += 1;
    return new Response(JSON.stringify({ messages: [{ id: 'wamid.1' }] }), { status: 200 });
  }) as typeof fetch;
  try {
    await assert.rejects(sendTemplateMessage(payload), /מכסת הודעות/);
    assert.equal(sends, 0);
  } finally {
    pool.connect = originalConnect;
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});

test('keeps an uncertain result in the quota and does not retry it', async () => {
  const originalConnect = pool.connect;
  const originalQuery = pool.query;
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };
  let sends = 0;
  const completions: unknown[][] = [];
  process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone-id';
  process.env.WHATSAPP_ACCESS_TOKEN = 'token';
  pool.connect = (async () => ({
    query: async (sql: string) => {
      if (sql.includes('AS ready')) return { rows: [{ ready: true }] };
      if (sql.includes('COUNT(*)')) return { rows: [{ count: '0' }] };
      if (sql.includes('INSERT INTO')) return { rows: [{ id: '42' }] };
      return { rows: [] };
    },
    release: () => undefined,
  })) as unknown as typeof pool.connect;
  pool.query = (async (_sql: string, values: unknown[]) => {
    completions.push(values);
    return { rowCount: 1, rows: [] };
  }) as unknown as typeof pool.query;
  globalThis.fetch = (async () => {
    sends += 1;
    return new Response(JSON.stringify({ error: { message: 'server error' } }), { status: 500 });
  }) as typeof fetch;
  try {
    await assert.rejects(sendTemplateMessageWithRetry(payload, 3));
    assert.equal(sends, 1);
    assert.deepEqual(completions, [['42', 'unknown', null]]);
  } finally {
    pool.connect = originalConnect;
    pool.query = originalQuery;
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
});