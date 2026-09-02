import { describe, expect, test } from 'vitest';
import {
  buildPersistenceFaces,
  shouldSkipPhotoScan,
} from './faceRecognition.service';
import type { DetectedFace } from '../types/faceRecognition.types';

function makeFace(weddingId: number): DetectedFace {
  return {
    id: `f-${weddingId}`,
    photoId: 'photo-1',
    weddingId,
    boundingBox: { x: 10, y: 10, width: 50, height: 60 },
    confidence: 0.88,
    embedding: [0.1, 0.2, 0.3],
    clusterId: null,
    createdAt: new Date().toISOString(),
    sourceDimensions: { width: 1200, height: 900 },
    previewUrl: '/photos/photo-1/full',
  };
}

describe('faceRecognition.service', () => {
  test('should skip duplicate scanned photos', () => {
    const scanned = new Set(['photo-1']);

    expect(shouldSkipPhotoScan('photo-1', scanned)).toBe(true);
    expect(shouldSkipPhotoScan('photo-2', scanned)).toBe(false);
  });

  test('persistence mapping preserves wedding isolation', () => {
    const one = makeFace(1);
    const two = makeFace(2);

    const mapped = buildPersistenceFaces([one, two]);

    expect(mapped[0].wedding_id).toBe(1);
    expect(mapped[1].wedding_id).toBe(2);
    expect(mapped.every((row) => row.photo_id === 'photo-1')).toBe(true);
  });
});
