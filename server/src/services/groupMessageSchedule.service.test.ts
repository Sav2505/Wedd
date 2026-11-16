import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DateTime } from 'luxon';
import { pool } from '../db/pool';
import { getGroupMessageSchedule, isGroupMessageSchedulerEnabled, saveGroupMessageSchedule } from './groupMessageSchedule.service';

test('group scheduling can be enabled while the legacy scheduler remains stopped', () => {
  const originalEnv = { ...process.env };
  process.env.IS_PROD = 'true';
  process.env.WHATSAPP_TEST_ONLY = 'false';
  process.env.WHATSAPP_SCHEDULER_ENABLED = 'false';
  process.env.WHATSAPP_GROUP_SCHEDULER_ENABLED = 'true';
  try {
    assert.equal(isGroupMessageSchedulerEnabled(), true);
  } finally {
    process.env = originalEnv;
  }
});

test('group schedules cannot be read from another wedding', async () => {
  const originalQuery = pool.query;
  pool.query = (async () => ({ rows: [] })) as unknown as typeof pool.query;
  try {
    await assert.rejects(getGroupMessageSchedule('couple-1', 42), (error: unknown) => (error as { statusCode?: number }).statusCode === 403);
  } finally {
    pool.query = originalQuery;
  }
});

  test('a previously sent legacy invitation cannot be scheduled again', async () => {
    const originalConnect = pool.connect;
    const calls: string[] = [];
    pool.connect = (async () => ({
      query: async (sql: string) => {
        calls.push(sql);
        if (sql.includes('FROM wedding_info wi JOIN guests couple')) return { rows: [{ wedding_date: '2027-06-14' }] };
        if (sql.includes('to_regclass')) return { rows: [{ delivery_ready: true, ready: true }] };
        if (sql.includes('AS locked')) return { rows: [{ locked: true }] };
        return { rows: [] };
      },
      release: () => undefined,
    })) as unknown as typeof pool.connect;
    try {
      await assert.rejects(
        saveGroupMessageSchedule('couple-1', 12, 'wedding_confirmation', []),
        (error: unknown) => (error as { statusCode?: number }).statusCode === 409,
      );
      assert.equal(calls.some((sql) => sql.includes('DELETE FROM wedding_whatsapp_group_schedule')), false);
    } finally {
      pool.connect = originalConnect;
    }
  });
test('saving future groups retains a completed group and validates the remaining groups', async () => {
  const originalConnect = pool.connect;
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const zone = 'Asia/Jerusalem';
  const completed = DateTime.now().setZone(zone).minus({ days: 3 }).startOf('hour');
  let future = DateTime.now().setZone(zone).plus({ days: 2 }).set({ hour: 12, minute: 0, second: 0, millisecond: 0 });
  if (future.weekday === 6) future = future.plus({ days: 1 });
  pool.connect = (async () => ({
    query: async (sql: string, values: unknown[] = []) => {
      calls.push({ sql, values });
      if (sql.includes('FROM wedding_info wi JOIN guests couple')) return { rows: [{ wedding_date: future.plus({ days: 10 }).toISODate() }] };
      if (sql.includes('to_regclass')) return { rows: [{ delivery_ready: true, ready: true }] };
      if (sql.includes('AS locked')) return { rows: [{ locked: false }] };
      if (sql.includes('SELECT status, guest_group_id')) return { rows: [{ status: 'completed', guest_group_id: 'friends', scheduled_at: completed.toJSDate() }] };
      if (sql.includes('FROM guest_groups gg')) return { rows: [
        { group_id: 'friends', name: 'חברים', total: 10, pending: 10, coming: 0 },
        { group_id: null, name: 'ללא קבוצה', total: 1, pending: 1, coming: 0 },
      ] };
      return { rows: [] };
    },
    release: () => undefined,
  })) as unknown as typeof pool.connect;
  try {
    await saveGroupMessageSchedule('couple-1', 12, 'wedding_reminder', [
      { groupId: 'friends', excluded: false, localDateTime: completed.toFormat("yyyy-MM-dd'T'HH:mm") },
      { groupId: null, excluded: false, localDateTime: future.toFormat("yyyy-MM-dd'T'HH:mm") },
    ]);
    const deletes = calls.filter((call) => call.sql.includes('DELETE FROM wedding_whatsapp_group_schedule'));
    assert.match(deletes[0].sql, /status IN \('scheduled', 'excluded', 'paused_quota', 'paused_schedule'\)/);
    const inserts = calls.filter((call) => call.sql.includes('INSERT INTO wedding_whatsapp_group_schedule'));
    assert.equal(inserts.length, 1);
    assert.equal(inserts[0].values[2], null);
    assert.equal(calls.at(-1)?.sql, 'COMMIT');
  } finally {
    pool.connect = originalConnect;
  }
});

test('group selection remains visible but disabled when delivery migrations are missing', async () => {
  const originalQuery = pool.query;
  pool.query = (async (sql: string) => {
    if (sql.includes('FROM wedding_info wi JOIN guests couple')) return { rows: [{ wedding_date: '2027-06-14' }] };
    if (sql.includes('to_regclass')) return { rows: [{ delivery_ready: false, ready: false }] };
    if (sql.includes('FROM wedding_message_schedule s')) return { rows: [{ sent: false }] };
    if (sql.includes('FROM guest_groups gg')) return { rows: [{ group_id: null, name: 'ללא קבוצה', total: 0, pending: 0, coming: 0 }] };
    if (sql.includes('FROM wedding_whatsapp_group_schedule')) {
      assert.doesNotMatch(sql, /wedding_whatsapp_group_deliveries/);
      return { rows: [] };
    }
    throw new Error(`Unexpected query: ${sql}`);
  }) as unknown as typeof pool.query;
  try {
    const result = await getGroupMessageSchedule('couple-1', 12);
    assert.equal(result.enabled, false);
    assert.equal(result.groups.length, 1);
  } finally {
    pool.query = originalQuery;
  }
});