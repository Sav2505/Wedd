import {
  FACE_RECOGNITION_CONFIG,
} from '../config';
import type {
  DetectedFace,
  FaceCluster,
  PersonCluster,
} from '../types/faceRecognition.types';
import {
  calculateFaceDistance,
  cosineSimilarity,
} from './faceDistance';

function averageEmbedding(faces: DetectedFace[]): number[] {
  const dim = faces[0]?.embedding.length ?? 0;
  const centroid = new Array<number>(dim).fill(0);

  for (const face of faces) {
    for (let i = 0; i < dim; i += 1) {
      centroid[i] += face.embedding[i] ?? 0;
    }
  }

  return centroid.map((value) => value / Math.max(faces.length, 1));
}

function buildCluster(clusterId: string, weddingId: number, faces: DetectedFace[]): FaceCluster {
  const centroid = averageEmbedding(faces);
  const photoIds = Array.from(new Set(faces.map((face) => face.photoId)));

  const representative = getRepresentativeFace(faces, centroid);

  const confidence = faces.reduce((sum, face) => sum + (face.confidence ?? 0.5), 0) / Math.max(faces.length, 1);

  return {
    id: clusterId,
    weddingId,
    faceIds: faces.map((face) => face.id),
    photoIds,
    centroid,
    representativeFaceId: representative.id,
    faceCount: faces.length,
    photoCount: photoIds.length,
    confidence,
  };
}

export function clusterFaces(
  faces: DetectedFace[],
  options?: {
    similarityThreshold?: number;
    minClusterSize?: number;
    metric?: 'cosine' | 'euclidean';
  },
): FaceCluster[] {
  if (faces.length === 0) {
    return [];
  }

  const metric = options?.metric ?? 'cosine';
  const similarityThreshold = options?.similarityThreshold ?? FACE_RECOGNITION_CONFIG.similarityThreshold;
  const minClusterSize = options?.minClusterSize ?? FACE_RECOGNITION_CONFIG.minClusterSize;

  const visited = new Set<string>();
  const clusters: FaceCluster[] = [];
  let clusterCounter = 1;

  for (const seed of faces) {
    if (visited.has(seed.id)) {
      continue;
    }

    const members: DetectedFace[] = [seed];
    visited.add(seed.id);

    let changed = true;
    while (changed) {
      changed = false;

      for (const candidate of faces) {
        if (visited.has(candidate.id)) {
          continue;
        }

        const isCloseToAnyMember = members.some((member) => {
          const distance = calculateFaceDistance(member.embedding, candidate.embedding, metric);
          const similarity = metric === 'cosine' ? 1 - distance : 1 / (1 + distance);
          return similarity >= similarityThreshold;
        });

        if (isCloseToAnyMember) {
          members.push(candidate);
          visited.add(candidate.id);
          changed = true;
        }
      }
    }

    if (members.length >= minClusterSize) {
      clusters.push(buildCluster(`person-${clusterCounter}`, seed.weddingId, members));
      clusterCounter += 1;
    }
  }

  return clusters;
}

function centroidSimilarity(a: FaceCluster, b: FaceCluster): number {
  return cosineSimilarity(a.centroid, b.centroid);
}

export function mergeClusters(
  clusters: FaceCluster[],
  facesById: Map<string, DetectedFace>,
  mergeThreshold: number = FACE_RECOGNITION_CONFIG.clusterMergeThreshold,
): FaceCluster[] {
  if (clusters.length <= 1) {
    return clusters;
  }

  const merged = [...clusters];
  let mergedSomething = true;

  while (mergedSomething) {
    mergedSomething = false;

    for (let i = 0; i < merged.length; i += 1) {
      for (let j = i + 1; j < merged.length; j += 1) {
        const left = merged[i];
        const right = merged[j];

        if (centroidSimilarity(left, right) < mergeThreshold) {
          continue;
        }

        const memberFaces = [...left.faceIds, ...right.faceIds]
          .map((faceId) => facesById.get(faceId))
          .filter((face): face is DetectedFace => Boolean(face));

        const rebuilt = buildCluster(left.id, left.weddingId, memberFaces);

        merged.splice(j, 1);
        merged[i] = rebuilt;
        mergedSomething = true;
        break;
      }

      if (mergedSomething) {
        break;
      }
    }
  }

  return merged;
}

export function getRepresentativeFace(faces: DetectedFace[], centroid?: number[]): DetectedFace {
  if (faces.length === 0) {
    throw new Error('Cannot select representative face from an empty list.');
  }

  const resolvedCentroid = centroid ?? averageEmbedding(faces);
  const areas = faces.map((face) => face.boundingBox.width * face.boundingBox.height);
  const maxArea = Math.max(...areas, 1);

  let best = faces[0];
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const face of faces) {
    const similarityToCentroid = cosineSimilarity(face.embedding, resolvedCentroid);
    const confidence = face.confidence ?? 0.5;
    const areaScore = (face.boundingBox.width * face.boundingBox.height) / maxArea;

    const totalScore =
      similarityToCentroid * FACE_RECOGNITION_CONFIG.representativeCentroidWeight +
      confidence * FACE_RECOGNITION_CONFIG.representativeConfidenceWeight +
      areaScore * FACE_RECOGNITION_CONFIG.representativeAreaWeight;

    if (totalScore > bestScore) {
      best = face;
      bestScore = totalScore;
    }
  }

  return best;
}

export function toPersonClusters(
  clusters: FaceCluster[],
  facesById: Map<string, DetectedFace>,
): PersonCluster[] {
  return clusters
    .map((cluster) => {
      const faces = cluster.faceIds
        .map((faceId) => facesById.get(faceId))
        .filter((face): face is DetectedFace => Boolean(face));

      if (faces.length === 0) {
        return null;
      }

      const representativeFace = faces.find((face) => face.id === cluster.representativeFaceId) ?? faces[0];

      return {
        id: cluster.id,
        weddingId: cluster.weddingId,
        representativeFace,
        faces,
        photoIds: Array.from(new Set(faces.map((face) => face.photoId))),
        faceCount: faces.length,
        photoCount: new Set(faces.map((face) => face.photoId)).size,
      };
    })
    .filter((cluster): cluster is PersonCluster => Boolean(cluster));
}
