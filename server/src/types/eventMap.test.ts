import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyEventMap, eventMapDocumentSchema } from './eventMap';

const marker = {
  id: '11111111-1111-4111-8111-111111111111', kind: 'marker', category: 'entrance', icon: 'entrance',
  label: 'כניסה', note: '', color: '#176B58', point: { x: 0.25, y: 0.75 },
};

test('map document accepts blank and normalized marker maps', () => {
  assert.equal(eventMapDocumentSchema.safeParse(emptyEventMap()).success, true);
  assert.equal(eventMapDocumentSchema.safeParse({ ...emptyEventMap(), elements: [marker] }).success, true);
});

test('map document rejects foreign identity fields and invalid geometry', () => {
  for (const document of [
    { ...emptyEventMap(), weddingId: 2 },
    { ...emptyEventMap(), elements: [marker, marker] },
    { ...emptyEventMap(), elements: [{ ...marker, point: { x: Infinity, y: 0 } }] },
    { ...emptyEventMap(), elements: [{ ...marker, point: { x: -0.1, y: 0 } }] },
    { ...emptyEventMap(), elements: [{ ...marker, kind: 'path', point: undefined, points: [{ x: 0, y: 0 }], dashed: false }] },
    { ...emptyEventMap(), elements: [{ ...marker, kind: 'area', point: undefined, corners: [{ x: 0, y: 0 }, { x: 0, y: 1 }] }] },
  ]) assert.equal(eventMapDocumentSchema.safeParse(document).success, false);
});