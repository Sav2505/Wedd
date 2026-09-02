export function toUnitVector(values: number[]): number[] {
  const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (norm === 0) {
    return values.map(() => 0);
  }
  return values.map((value) => value / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return 0;
  }

  const aUnit = toUnitVector(a);
  const bUnit = toUnitVector(b);

  let dotProduct = 0;
  for (let i = 0; i < aUnit.length; i += 1) {
    dotProduct += aUnit[i] * bUnit[i];
  }

  return dotProduct;
}

export function cosineDistance(a: number[], b: number[]): number {
  return 1 - cosineSimilarity(a, b);
}

export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

export function calculateFaceDistance(
  a: number[],
  b: number[],
  metric: 'cosine' | 'euclidean' = 'cosine',
): number {
  return metric === 'cosine' ? cosineDistance(a, b) : euclideanDistance(a, b);
}
