import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../db/pool';
import { updateWeddingInfo, WeddingInfoUpdate } from './info.service';

test('gift link updates are parameterized, wedding-scoped and normalize cleared fields', async () => {
  const cases: Array<{ input: WeddingInfoUpdate; values: unknown[]; fields: string[] }> = [
    {
      input: { bride_paybox_url: ' links.payboxapp.com/bride ', groom_paybox_url: 'https://links.payboxapp.com/groom' },
      values: ['https://links.payboxapp.com/bride', 'https://links.payboxapp.com/groom', 12],
      fields: ['bride_paybox_url', 'groom_paybox_url'],
    },
    {
      input: { bride_paybox_url: '   ' },
      values: [null, 12],
      fields: ['bride_paybox_url'],
    },
    {
      input: { bride_bit_url: 'https://example.com/bit', bride_paybox_url: null },
      values: ['https://example.com/bit', null, 12],
      fields: ['bride_bit_url', 'bride_paybox_url'],
    },
  ];
  const originalQuery = pool.query;
  try {
    for (const { input, values, fields } of cases) {
      const saved = { id: 12, ...input };
      let queryCount = 0;
      pool.query = (async (sql: string, parameters: unknown[]) => {
        queryCount += 1;
        assert.deepEqual(parameters, values);
        for (const [index, field] of fields.entries()) {
          assert.ok(sql.includes(`${field} = $${index + 1}`));
        }
        assert.ok(sql.endsWith(`WHERE id = $${values.length} RETURNING *`));
        assert.ok(!sql.includes('groom_bit_url ='));
        return { rows: [saved] };
      }) as unknown as typeof pool.query;
      assert.deepEqual(await updateWeddingInfo(input, 12), saved);
      assert.equal(queryCount, 1);
    }
    let queryCount = 0;
    pool.query = (async () => { queryCount += 1; return { rows: [] }; }) as unknown as typeof pool.query;
    for (const field of ['bride_paybox_url', 'groom_paybox_url'] as const) {
      for (const value of ['javascript:alert(1)', 'https://', 'not a url']) {
        await assert.rejects(updateWeddingInfo({ [field]: value }, 12), /קישור PayBox אינו תקין/);
      }
    }
    assert.equal(queryCount, 0);
  } finally {
    pool.query = originalQuery;
  }
});