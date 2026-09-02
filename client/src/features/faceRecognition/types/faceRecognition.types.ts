import type { Photo } from '../../../types/domain';
import type { FaceDetection, EmbeddingResult } from 'facenet-js';
import type { FaceScanStage } from '../config';

export interface FaceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PhotoDimensions {
  width: number;
  height: number;
}

export interface DetectedFace {
  id: string;
  photoId: string;
  weddingId: number;
  boundingBox: FaceBoundingBox;
  confidence?: number;
  embedding: number[];
  clusterId?: string | null;
  createdAt?: string;
  sourceDimensions: PhotoDimensions;
  previewUrl: string;
}

export interface PhotoFace extends DetectedFace {
  photoUrl: string;
}

export interface FaceCluster {
  id: string;
  weddingId: number;
  faceIds: string[];
  photoIds: string[];
  centroid: number[];
  representativeFaceId: string;
  faceCount: number;
  photoCount: number;
  confidence: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PersonCluster {
  id: string;
  weddingId: number;
  representativeFace: DetectedFace;
  faces: DetectedFace[];
  photoIds: string[];
  faceCount: number;
  photoCount: number;
}

export interface FaceScanProgress {
  stage: FaceScanStage;
  total: number;
  processed: number;
  percentage: number;
  facesFound: number;
  errorsCount: number;
  currentPhotoId?: string;
  currentPhotoIndex?: number;
  message?: string;
}

export interface FaceScanError {
  photoId: string;
  message: string;
}

export interface FaceScanResult {
  weddingId: number;
  startedAt: string;
  completedAt: string;
  version: string;
  modelVersion: string;
  faces: DetectedFace[];
  clusters: PersonCluster[];
  errors: FaceScanError[];
  skippedPhotoIds: string[];
}

export interface FaceScanPhotoInput {
  photo: Photo;
  weddingId: number;
}

export interface ProcessedPhotoFaces {
  photoId: string;
  sourceDimensions: PhotoDimensions;
  faces: DetectedFace[];
  detections: FaceDetection[];
  embeddings: EmbeddingResult[];
}

export interface ScanPersistenceFaceRecord {
  id: string;
  wedding_id: number;
  photo_id: string;
  cluster_id: string | null;
  bounding_box: FaceBoundingBox;
  confidence: number | null;
  embedding: number[];
  source_width: number;
  source_height: number;
  scan_version: string;
  model_version: string;
}

export interface ScanPersistenceClusterRecord {
  id: string;
  wedding_id: number;
  representative_face_id: string;
  representative_photo_id: string;
  face_count: number;
  photo_count: number;
  centroid_embedding: number[];
  confidence: number;
  scan_version: string;
  model_version: string;
}
