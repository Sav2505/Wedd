import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { normalizeMapImage } from './eventMapImage';

test('background decoder normalizes valid images and rejects spoofed or oversized images', async () => {
  const buffer = await sharp({ create: { width: 200, height: 100, channels: 3, background: '#ffffff' } }).png().toBuffer();
  const file = { buffer, size: buffer.length, mimetype: 'image/png' } as Express.Multer.File;
  const result = await normalizeMapImage(file);
  assert.equal(result.width, 200);
  assert.equal(result.height, 100);
  assert.equal(result.mimeType, 'image/webp');
  await assert.rejects(normalizeMapImage({ ...file, mimetype: 'image/jpeg' }), { statusCode: 400 });
  await assert.rejects(normalizeMapImage({ ...file, buffer: Buffer.from('not an image') }), { statusCode: 400 });
  await assert.rejects(normalizeMapImage({ ...file, size: 6 * 1024 * 1024 }), { statusCode: 400 });
  const huge = await sharp({ create: { width: 4097, height: 100, channels: 3, background: '#fff' } }).png().toBuffer();
  await assert.rejects(normalizeMapImage({ ...file, buffer: huge, size: huge.length }), { statusCode: 400 });
});