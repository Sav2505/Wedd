import type { EmbeddingResult } from 'facenet-js';
import api from '../../../services/api';
import type { Photo, ApiResponse } from '../../../types/domain';
import {
  FACE_MODEL_VERSION,
  FACE_SCAN_VERSION,
  FACE_RECOGNITION_CONFIG,
  type FaceScanStage,
} from '../config';
import { getFaceDetector } from './faceDetector.service';
import {
  convertDetectionToBoundingBox,
  getImageDimensions,
  loadImageElement,
  nextAnimationFrame,
  toFullResolutionSrc,
} from './imageProcessing.service';
import type {
  DetectedFace,
  FaceScanError,
  FaceScanProgress,
  FaceScanResult,
  PersonCluster,
  ScanPersistenceClusterRecord,
  ScanPersistenceFaceRecord,
} from '../types/faceRecognition.types';

interface ScannedPhotosResponse {
  photoIds: string[];
}

interface PeopleResponse {
  clusters: PersonCluster[];
}

interface PersistFacesPayload {
  weddingId: number;
  scanVersion: string;
  modelVersion: string;
  faces: ScanPersistenceFaceRecord[];
  clusters: ScanPersistenceClusterRecord[];
}

function nowIso(): string {
  return new Date().toISOString();
}

function buildFaceId(photoId: string, index: number): string {
  return `${photoId}::${index}`;
}

function embeddingVector(embedding: EmbeddingResult | null): number[] {
  if (!embedding || !embedding.embeddings || embedding.embeddings.length === 0) {
    return [];
  }

  const vector = embedding.embeddings[0];
  const values = Array.from(vector.floatEmbedding ?? []);
  return values;
}

function emitProgress(
  callback: ((progress: FaceScanProgress) => void) | undefined,
  progress: FaceScanProgress,
): void {
  callback?.(progress);
}

export function shouldSkipPhotoScan(photoId: string, alreadyScanned?: Set<string>): boolean {
  return Boolean(alreadyScanned?.has(photoId));
}

function createProgress(
  total: number,
  processed: number,
  facesFound: number,
  errorsCount: number,
  stage: FaceScanStage,
  currentPhotoId?: string,
  message?: string,
): FaceScanProgress {
  const percentage = total === 0 ? 100 : Math.round((processed / total) * 100);
  return {
    stage,
    total,
    processed,
    percentage,
    facesFound,
    errorsCount,
    currentPhotoId,
    currentPhotoIndex: processed,
    message,
  };
}

export async function fetchScannedPhotoIds(
  weddingId: number,
  scanVersion: string = FACE_SCAN_VERSION,
  modelVersion: string = FACE_MODEL_VERSION,
): Promise<Set<string>> {
  const { data } = await api.get<ApiResponse<ScannedPhotosResponse>>('/photos/faces/scanned', {
    params: { weddingId, scanVersion, modelVersion },
  });

  if (!data.success || !data.data) {
    throw new Error(data.message ?? 'שגיאה בטעינת תמונות שנסרקו');
  }

  return new Set(data.data.photoIds);
}

export async function fetchPeopleClusters(weddingId: number): Promise<PersonCluster[]> {
  const { data } = await api.get<ApiResponse<PeopleResponse>>('/photos/faces/clusters', {
    params: { weddingId },
  });

  if (!data.success || !data.data) {
    throw new Error(data.message ?? 'שגיאה בטעינת אנשים מהגלריה');
  }

  return data.data.clusters;
}

export async function persistScanResult(payload: PersistFacesPayload): Promise<void> {
  const { data } = await api.post<ApiResponse>('/photos/faces/scan-results', payload);
  if (!data.success) {
    throw new Error(data.message ?? 'שמירת תוצאות הסריקה נכשלה');
  }
}

export function buildPersistenceFaces(faces: DetectedFace[]): ScanPersistenceFaceRecord[] {
  return faces.map((face) => ({
    id: face.id,
    wedding_id: face.weddingId,
    photo_id: face.photoId,
    cluster_id: face.clusterId ?? null,
    bounding_box: face.boundingBox,
    confidence: face.confidence ?? null,
    embedding: face.embedding,
    source_width: face.sourceDimensions.width,
    source_height: face.sourceDimensions.height,
    scan_version: FACE_SCAN_VERSION,
    model_version: FACE_MODEL_VERSION,
  }));
}

export function buildPersistenceClusters(clusters: PersonCluster[]): ScanPersistenceClusterRecord[] {
  return clusters.map((cluster) => ({
    id: cluster.id,
    wedding_id: cluster.weddingId,
    representative_face_id: cluster.representativeFace.id,
    representative_photo_id: cluster.representativeFace.photoId,
    face_count: cluster.faceCount,
    photo_count: cluster.photoCount,
    centroid_embedding: cluster.representativeFace.embedding,
    confidence: cluster.representativeFace.confidence ?? 0.5,
    scan_version: FACE_SCAN_VERSION,
    model_version: FACE_MODEL_VERSION,
  }));
}

export async function scanPhotosForFaces(options: {
  weddingId: number;
  photos: Photo[];
  alreadyScanned?: Set<string>;
  signal?: AbortSignal;
  onProgress?: (progress: FaceScanProgress) => void;
}): Promise<{ faces: DetectedFace[]; errors: FaceScanError[]; skippedPhotoIds: string[] }> {
  const { weddingId, photos, alreadyScanned, signal, onProgress } = options;
  const detector = await getFaceDetector();

  const faces: DetectedFace[] = [];
  const errors: FaceScanError[] = [];
  const skippedPhotoIds: string[] = [];

  let processed = 0;

  emitProgress(onProgress, createProgress(photos.length, processed, 0, 0, 'initializing'));

  for (const photo of photos) {
    if (signal?.aborted) {
      throw new DOMException('scan_cancelled', 'AbortError');
    }

    if (shouldSkipPhotoScan(photo.id, alreadyScanned)) {
      skippedPhotoIds.push(photo.id);
      processed += 1;
      emitProgress(onProgress, createProgress(photos.length, processed, faces.length, errors.length, 'loadingImage', photo.id, 'דילוג על תמונה שכבר נסרקה'));
      continue;
    }

    try {
      emitProgress(onProgress, createProgress(photos.length, processed, faces.length, errors.length, 'loadingImage', photo.id));
      const fullSrc = toFullResolutionSrc(photo.url ?? '');
      const prepared = await loadImageElement(fullSrc);
      const sourceDimensions = getImageDimensions(prepared.image);

      emitProgress(onProgress, createProgress(photos.length, processed, faces.length, errors.length, 'detecting', photo.id));
      const detections = detector.detectFromImage(prepared.image);
      const limited = detections.slice(0, FACE_RECOGNITION_CONFIG.maxFacesPerImage);

      emitProgress(onProgress, createProgress(photos.length, processed, faces.length, errors.length, 'embedding', photo.id));

      for (let index = 0; index < limited.length; index += 1) {
        const detection = limited[index];
        const embedding = detector.embed({
          source: prepared.image,
          detection,
        });

        const vector = embeddingVector(embedding);
        if (vector.length === 0) {
          continue;
        }

        faces.push({
          id: buildFaceId(photo.id, index),
          weddingId,
          photoId: photo.id,
          boundingBox: convertDetectionToBoundingBox(detection, sourceDimensions),
          confidence: detection.categories?.[0]?.score,
          embedding: vector,
          clusterId: null,
          createdAt: nowIso(),
          sourceDimensions,
          previewUrl: fullSrc,
        });
      }

      processed += 1;
      emitProgress(onProgress, createProgress(photos.length, processed, faces.length, errors.length, 'detecting', photo.id));

      if (processed % FACE_RECOGNITION_CONFIG.imageYieldInterval === 0) {
        await nextAnimationFrame();
      }
    } catch (error) {
      processed += 1;
      errors.push({
        photoId: photo.id,
        message: error instanceof Error ? error.message : 'שגיאה לא צפויה בעיבוד תמונה',
      });

      emitProgress(onProgress, createProgress(photos.length, processed, faces.length, errors.length, 'error', photo.id));
    }
  }

  return { faces, errors, skippedPhotoIds };
}

export function toFaceScanResult(params: {
  weddingId: number;
  startedAt: string;
  faces: DetectedFace[];
  clusters: PersonCluster[];
  errors: FaceScanError[];
  skippedPhotoIds: string[];
}): FaceScanResult {
  return {
    weddingId: params.weddingId,
    startedAt: params.startedAt,
    completedAt: nowIso(),
    version: FACE_SCAN_VERSION,
    modelVersion: FACE_MODEL_VERSION,
    faces: params.faces,
    clusters: params.clusters,
    errors: params.errors,
    skippedPhotoIds: params.skippedPhotoIds,
  };
}
