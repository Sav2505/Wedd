import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { pool } from '../db/pool';
import eventMapRoutes from './eventMap.routes';
import { emptyEventMap } from '../types/eventMap';
import sharp from 'sharp';

test('map save accepts valid multipart requests and enforces upload limits', async context => {
  const originalQuery = pool.query;
  const originalConnect = pool.connect;
  const document = { ...emptyEventMap(), width: 200, height: 100, hasBackground: true };
  const row = { draft_document: document, revision: 1, published_revision: null, published_at: null };
  let savedImage: Buffer | undefined;
  let writes = 0;
  pool.query = (async () => ({ rows: [{ id: 'couple', wedding_id: 12, role: 'couple' }] })) as unknown as typeof pool.query;
  pool.connect = (async () => ({
    query: async (sql: string, values?: unknown[]) => {
      if (sql.startsWith('SELECT wedding_id')) return { rows: [{ wedding_id: 12, role: 'couple' }] };
      if (sql.startsWith('UPDATE')) { savedImage = values?.[3] as Buffer; writes += 1; }
      return { rows: [row] };
    },
    release: () => {},
  })) as unknown as typeof pool.connect;
  const app = express();
  app.use('/event-map', eventMapRoutes);
  app.use((error: Error & { statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
    res.status(error.statusCode ?? 500).json({ message: error.message });
  });
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise<void>(resolve => server.once('listening', resolve));
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const endpoint = `http://127.0.0.1:${address.port}/event-map/draft`;
    const png = await sharp({ create: { width: 200, height: 100, channels: 3, background: '#ffffff' } }).png().toBuffer();
    const payload = JSON.stringify({ document, backgroundAction: 'replace', expectedRevision: 1, expectedPublishedRevision: null });
    const form = new FormData();
    form.append('payload', payload);
    form.append('background', new Blob([new Uint8Array(png)], { type: 'image/png' }), 'background.png');
    const response = await fetch(endpoint, { method: 'PUT', headers: { 'X-Guest-ID': 'couple' }, body: form });
    const body = await response.json() as { message?: string; data?: { document: unknown } };
    assert.equal(response.status, 200, body.message);
    assert.ok(savedImage?.length, 'the validated image must reach the atomic save');
    assert.deepEqual(body.data?.document, document);

    await context.test('saving an existing background needs no new file', async () => {
      const keep = new FormData();
      keep.append('payload', JSON.stringify({ document, backgroundAction: 'keep', expectedRevision: 1, expectedPublishedRevision: null }));
      const result = await fetch(endpoint, { method: 'PUT', headers: { 'X-Guest-ID': 'couple' }, body: keep });
      assert.equal(result.status, 200, await result.text());
    });

    const invalid: Array<{ name: string; status: number; message: RegExp; make: () => FormData }> = [
      { name: 'oversized image', status: 413, message: /5MB/, make: () => {
        const form = new FormData();
        form.append('payload', payload);
        form.append('background', new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'image/png' }), 'large.png');
        return form;
      } },
      { name: 'oversized document', status: 413, message: /256KB/, make: () => {
        const form = new FormData(); form.append('payload', 'x'.repeat(256 * 1024 + 1)); return form;
      } },
      { name: 'second file', status: 400, message: /תמונת רקע אחת/, make: () => {
        const form = new FormData(); form.append('payload', payload);
        form.append('background', new Blob([new Uint8Array(png)], { type: 'image/png' }), 'first.png');
        form.append('background', new Blob([new Uint8Array(png)], { type: 'image/png' }), 'second.png'); return form;
      } },
      { name: 'extra document field', status: 400, message: /שדה אחד/, make: () => {
        const form = new FormData(); form.append('payload', payload); form.append('extra', 'unexpected'); return form;
      } },
      { name: 'unexpected file field', status: 400, message: /background/, make: () => {
        const form = new FormData(); form.append('payload', payload);
        form.append('other', new Blob([new Uint8Array(png)], { type: 'image/png' }), 'wrong-field.png'); return form;
      } },
    ];
    for (const example of invalid) await context.test(example.name, async () => {
      const previousWrites = writes;
      const result = await fetch(endpoint, { method: 'PUT', headers: { 'X-Guest-ID': 'couple' }, body: example.make() });
      const error = await result.json() as { message: string };
      assert.equal(result.status, example.status, error.message);
      assert.match(error.message, example.message);
      assert.equal(writes, previousWrites, 'invalid uploads must never reach map persistence');
    });
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    pool.query = originalQuery;
    pool.connect = originalConnect;
  }
});