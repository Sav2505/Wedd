import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../db/pool';
import { getBackground, getDraft, getPublished, saveDraft, setPublished } from './eventMap.service';
import { emptyEventMap } from '../types/eventMap';

test('published reads use the server identity wedding and expose no draft', async () => {
  const original = pool.query;
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  pool.query = (async (sql: string, values: unknown[]) => {
    calls.push({ sql, values });
    return { rows: calls.length === 1 ? [{ wedding_id: 12, role: 'guest' }] : [] };
  }) as typeof pool.query;
  try {
    assert.equal(await getPublished('guest-a'), null);
    assert.deepEqual(calls[0].values, ['guest-a']);
    assert.deepEqual(calls[1].values, [12]);
    assert.doesNotMatch(calls[1].sql, /draft/);
  } finally { pool.query = original; }
});

test('guest cannot access draft metadata or draft images', async () => {
  const original = pool.query;
  pool.query = (async () => ({ rows: [{ wedding_id: 9, role: 'guest' }] })) as unknown as typeof pool.query;
  try {
    await assert.rejects(getDraft('guest'), { statusCode: 403 });
    await assert.rejects(getBackground('guest', true, 1), { statusCode: 403 });
  } finally { pool.query = original; }
});

test('published image lookup checks wedding and exact published revision', async () => {
  const original = pool.query;
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  pool.query = (async (sql: string, values: unknown[]) => {
    calls.push({ sql, values });
    return { rows: calls.length === 1 ? [{ wedding_id: 7, role: 'guest' }] : [] };
  }) as typeof pool.query;
  try {
    await assert.rejects(getBackground('guest', false, 4), { statusCode: 404 });
    assert.deepEqual(calls[1].values, [7, 4]);
    assert.match(calls[1].sql, /published_revision = \$2/);
    assert.doesNotMatch(calls[1].sql, /draft/);
  } finally { pool.query = original; }
});

test('save and publication lock, compare versions, snapshot and rollback safely', async () => {
  const original = pool.connect;
  const calls: Array<{ sql: string; values?: unknown[] }> = [];
  let revision = 2;
  const row = { draft_document: emptyEventMap(), revision: 2, published_revision: 1, published_at: '2026-01-01' };
  pool.connect = (async () => ({
    query: async (sql: string, values?: unknown[]) => {
      calls.push({ sql, values });
      if (sql.startsWith('SELECT wedding_id')) return { rows: [{ wedding_id: 8, role: 'couple' }] };
      return { rows: [{ ...row, revision }] };
    },
    release: () => {},
  })) as unknown as typeof pool.connect;
  try {
    await saveDraft('couple', { expectedRevision: 2, expectedPublishedRevision: 1 }, emptyEventMap(), 'keep');
    const update = calls.find(call => call.sql.startsWith('UPDATE'))!;
    assert.deepEqual(update.values?.slice(0, 1), [8]);
    assert.doesNotMatch(update.sql, /published_document =/);
    assert.ok(calls.some(call => call.sql.includes('FOR UPDATE')));
    assert.equal(calls.at(-1)?.sql, 'COMMIT');
    calls.length = 0;
    await assert.rejects(setPublished('couple', { expectedRevision: 1, expectedPublishedRevision: 1 }, true), { statusCode: 409 });
    assert.equal(calls.at(-1)?.sql, 'ROLLBACK');
    assert.equal(calls.some(call => call.sql.startsWith('UPDATE')), false);
    revision = 2;
    await assert.rejects(setPublished('couple', { expectedRevision: 2, expectedPublishedRevision: 1 }, true), { statusCode: 400 });
    row.draft_document.hasBackground = true;
    calls.length = 0;
    await setPublished('couple', { expectedRevision: 2, expectedPublishedRevision: 1 }, true);
    assert.ok(calls.some(call => /published_background_data = draft_background_data/.test(call.sql)));
    calls.length = 0;
    await setPublished('couple', { expectedRevision: 2, expectedPublishedRevision: 1 }, false);
    assert.ok(calls.some(call => /published_document = NULL/.test(call.sql)));
    assert.equal(calls.some(call => /SET draft_document/.test(call.sql)), false);
  } finally { pool.connect = original; }
});