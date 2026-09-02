import { describe, expect, test } from 'vitest';
import {
  calculateFaceDistance,
  cosineDistance,
  cosineSimilarity,
  euclideanDistance,
} from './faceDistance';

describe('faceDistance utils', () => {
  test('returns high similarity for identical vectors', () => {
    const a = [1, 0, 0, 1];
    const b = [1, 0, 0, 1];

    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 6);
    expect(cosineDistance(a, b)).toBeCloseTo(0, 6);
  });

  test('returns larger euclidean distance for distinct vectors', () => {
    const a = [1, 1, 1];
    const b = [3, 3, 3];

    expect(euclideanDistance(a, b)).toBeGreaterThan(3);
  });

  test('calculateFaceDistance supports cosine and euclidean', () => {
    const a = [0.2, 0.3, 0.4];
    const b = [0.21, 0.29, 0.41];

    expect(calculateFaceDistance(a, b, 'cosine')).toBeLessThan(0.02);
    expect(calculateFaceDistance(a, b, 'euclidean')).toBeGreaterThan(0);
  });
});
