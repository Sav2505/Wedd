import { NextFunction, Request, Response } from 'express';
import { createError } from '../middleware/errorHandler';
import {
  deleteFaceDataByWedding,
  getClustersByWedding,
  getScannedPhotoIds,
  saveFaceScan,
} from '../services/faceRecognition.service';
import type {
  FaceBoundingBox,
  PersistFaceScanPayload,
  PhotoFaceRecord,
} from '../types';

function parseWeddingId(raw: unknown): number {
  const id = Number(raw);
  if (!id) {
    throw createError('חסר weddingId תקין', 400);
  }
  return id;
}

function isBoundingBox(value: unknown): value is FaceBoundingBox {
  if (typeof value !== 'object' || !value) {
    return false;
  }
  const box = value as Record<string, unknown>;
  return [box.x, box.y, box.width, box.height].every((val) => typeof val === 'number');
}

function isFaceRecord(value: unknown): value is PhotoFaceRecord {
  if (typeof value !== 'object' || !value) {
    return false;
  }

  const face = value as Record<string, unknown>;

  return (
    typeof face.id === 'string'
    && typeof face.wedding_id === 'number'
    && typeof face.photo_id === 'string'
    && (typeof face.cluster_id === 'string' || face.cluster_id === null)
    && isBoundingBox(face.bounding_box)
    && Array.isArray(face.embedding)
    && face.embedding.every((entry) => typeof entry === 'number')
    && (typeof face.confidence === 'number' || face.confidence === null)
    && typeof face.source_width === 'number'
    && typeof face.source_height === 'number'
    && typeof face.scan_version === 'string'
    && typeof face.model_version === 'string'
  );
}

export async function getScannedPhotos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const weddingId = parseWeddingId(req.query.weddingId);
    const scanVersion = String(req.query.scanVersion ?? '1');
    const modelVersion = String(req.query.modelVersion ?? 'facenet-js@0.1.2');

    const photoIds = await getScannedPhotoIds(weddingId, scanVersion, modelVersion);

    res.status(200).json({
      success: true,
      data: { photoIds },
    });
  } catch (error) {
    next(error);
  }
}

export async function getWeddingFaceClusters(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const weddingId = parseWeddingId(req.query.weddingId);

    const clusters = await getClustersByWedding(weddingId);

    res.status(200).json({
      success: true,
      data: {
        clusters: clusters.map((cluster) => ({
          id: cluster.id,
          weddingId: cluster.weddingId,
          representativeFace: cluster.representativeFace
            ? {
              id: cluster.representativeFace.id,
              photoId: cluster.representativeFace.photo_id,
              weddingId: cluster.weddingId,
              boundingBox: cluster.representativeFace.bounding_box,
              confidence: cluster.representativeFace.confidence ?? undefined,
              embedding: [],
              clusterId: cluster.id,
              previewUrl: `/photos/${cluster.representativeFace.photo_id}/thumb`,
              sourceDimensions: {
                width: cluster.representativeFace.source_width,
                height: cluster.representativeFace.source_height,
              },
            }
            : null,
          faces: cluster.faces.map((face) => ({
            id: face.id,
            photoId: face.photo_id,
            weddingId: cluster.weddingId,
            boundingBox: face.bounding_box,
            confidence: face.confidence ?? undefined,
            embedding: [],
            clusterId: cluster.id,
            previewUrl: `/photos/${face.photo_id}/thumb`,
            sourceDimensions: {
              width: face.source_width,
              height: face.source_height,
            },
          })),
          photoIds: cluster.photoIds,
          faceCount: cluster.faceCount,
          photoCount: cluster.photoCount,
        })).filter((cluster) => cluster.representativeFace !== null),
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function saveWeddingFaceScan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as Partial<PersistFaceScanPayload>;

    const weddingId = parseWeddingId(body.weddingId);

    const faces = Array.isArray(body.faces) ? body.faces : [];
    const clusters = Array.isArray(body.clusters) ? body.clusters : [];

    if (!faces.every((face) => isFaceRecord(face))) {
      throw createError('מבנה faces אינו תקין', 400);
    }

    await saveFaceScan({
      weddingId,
      scanVersion: String(body.scanVersion ?? '1'),
      modelVersion: String(body.modelVersion ?? 'facenet-js@0.1.2'),
      faces,
      clusters: clusters as PersistFaceScanPayload['clusters'],
    });

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function clearWeddingFaceData(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const weddingId = parseWeddingId(req.params.weddingId);
    await deleteFaceDataByWedding(weddingId);

    res.status(200).json({ success: true, message: 'נתוני זיהוי הפנים נמחקו' });
  } catch (error) {
    next(error);
  }
}
