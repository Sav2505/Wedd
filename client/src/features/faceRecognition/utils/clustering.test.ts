import { describe, expect, test } from 'vitest';
import type { DetectedFace } from '../types/faceRecognition.types';
import {
  clusterFaces,
  getRepresentativeFace,
  mergeClusters,
  toPersonClusters,
} from './clustering';

function makeFace(
  id: string,
  photoId: string,
  weddingId: number,
  embedding: number[],
  confidence = 0.8,
): DetectedFace {
  return {
    id,
    photoId,
    weddingId,
    embedding,
    confidence,
    clusterId: null,
    createdAt: new Date().toISOString(),
    sourceDimensions: { width: 1000, height: 800 },
    previewUrl: '/photos/test/thumb',
    boundingBox: { x: 10, y: 12, width: 100, height: 120 },
  };
}

describe('clustering utils', () => {
  test('groups two photos of the same person into one cluster', () => {
    const faces = [
      makeFace('f1', 'p1', 1, [1, 0, 0, 0]),
      makeFace('f2', 'p2', 1, [0.98, 0.02, 0, 0]),
    ];

    const clusters = clusterFaces(faces, { similarityThreshold: 0.95, metric: 'cosine' });
    expect(clusters).toHaveLength(1);
    expect(clusters[0].photoCount).toBe(2);
  });

  test('separates clearly different people into distinct clusters', () => {
    const faces = [
      makeFace('f1', 'p1', 1, [1, 0, 0, 0]),
      makeFace('f2', 'p2', 1, [0, 1, 0, 0]),
    ];

    const clusters = clusterFaces(faces, { similarityThreshold: 0.95, metric: 'cosine' });
    expect(clusters).toHaveLength(2);
  });

  test('mergeClusters merges close centroids', () => {
    const f1 = makeFace('f1', 'p1', 1, [1, 0, 0, 0]);
    const f2 = makeFace('f2', 'p2', 1, [0.99, 0.01, 0, 0]);

    const initial = clusterFaces([f1, f2], { similarityThreshold: 0.9999, metric: 'cosine' });
    expect(initial.length).toBeGreaterThanOrEqual(1);

    const byId = new Map([
      [f1.id, f1],
      [f2.id, f2],
    ]);

    const merged = mergeClusters(initial, byId, 0.98);
    expect(merged).toHaveLength(1);

    const people = toPersonClusters(merged, byId);
    expect(people[0].photoCount).toBe(2);
  });

  test('selects representative face by confidence and centroid proximity', () => {
    const a = makeFace('fa', 'p1', 1, [1, 0, 0, 0], 0.95);
    const b = makeFace('fb', 'p1', 1, [0.4, 0.6, 0, 0], 0.55);

    const representative = getRepresentativeFace([a, b], [0.9, 0.1, 0, 0]);
    expect(representative.id).toBe('fa');
  });
});
