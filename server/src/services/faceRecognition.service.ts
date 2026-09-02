import { pool } from '../db/pool';
import {
  FaceClusterRecord,
  PersistFaceScanPayload,
  PhotoFaceRecord,
} from '../types';

interface FaceClusterRow {
  id: string;
  wedding_id: number;
  representative_photo_id: string;
  representative_face_id: string | null;
  face_count: number;
  photo_count: number;
  confidence: number;
}

interface PhotoFaceRow {
  id: string;
  photo_id: string;
  cluster_id: string | null;
  bounding_box: { x: number; y: number; width: number; height: number };
  confidence: number | null;
  source_width: number;
  source_height: number;
}

let ensureSchemaPromise: Promise<void> | null = null;

async function ensureFaceRecognitionSchema(): Promise<void> {
  if (!ensureSchemaPromise) {
    ensureSchemaPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS face_clusters (
          id TEXT PRIMARY KEY,
          wedding_id INTEGER NOT NULL REFERENCES wedding_info(id) ON DELETE CASCADE,
          representative_photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
          representative_face_id TEXT NULL,
          face_count INTEGER NOT NULL DEFAULT 0,
          photo_count INTEGER NOT NULL DEFAULT 0,
          centroid_embedding REAL[] NOT NULL,
          confidence REAL NOT NULL DEFAULT 0,
          scan_version TEXT NOT NULL,
          model_version TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS photo_faces (
          id TEXT PRIMARY KEY,
          wedding_id INTEGER NOT NULL REFERENCES wedding_info(id) ON DELETE CASCADE,
          photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
          cluster_id TEXT NULL REFERENCES face_clusters(id) ON DELETE SET NULL,
          bounding_box JSONB NOT NULL,
          embedding REAL[] NOT NULL,
          confidence REAL NULL,
          source_width INTEGER NOT NULL,
          source_height INTEGER NOT NULL,
          scan_version TEXT NOT NULL,
          model_version TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_face_clusters_wedding_id ON face_clusters(wedding_id);
        CREATE INDEX IF NOT EXISTS idx_face_clusters_scan_model ON face_clusters(scan_version, model_version);
        CREATE INDEX IF NOT EXISTS idx_photo_faces_wedding_id ON photo_faces(wedding_id);
        CREATE INDEX IF NOT EXISTS idx_photo_faces_photo_id ON photo_faces(photo_id);
        CREATE INDEX IF NOT EXISTS idx_photo_faces_cluster_id ON photo_faces(cluster_id);
        CREATE INDEX IF NOT EXISTS idx_photo_faces_scan_model ON photo_faces(scan_version, model_version);
      `);

      await pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint
            WHERE conname = 'fk_face_clusters_representative_face'
          ) THEN
            ALTER TABLE face_clusters
              ADD CONSTRAINT fk_face_clusters_representative_face
              FOREIGN KEY (representative_face_id)
              REFERENCES photo_faces(id)
              ON DELETE SET NULL;
          END IF;
        END
        $$;
      `);
    })().catch((error) => {
      ensureSchemaPromise = null;
      throw error;
    });
  }

  await ensureSchemaPromise;
}

export async function getScannedPhotoIds(
  weddingId: number,
  scanVersion: string,
  modelVersion: string,
): Promise<string[]> {
  await ensureFaceRecognitionSchema();

  const { rows } = await pool.query<{ photo_id: string }>(
    `SELECT DISTINCT photo_id
       FROM photo_faces
      WHERE wedding_id = $1
        AND scan_version = $2
        AND model_version = $3
        AND cluster_id IS NOT NULL`,
    [weddingId, scanVersion, modelVersion],
  );

  return rows.map((row) => row.photo_id);
}

function assertWeddingScope(
  weddingId: number,
  faces: PhotoFaceRecord[],
  clusters: FaceClusterRecord[],
): void {
  const hasFaceMismatch = faces.some((face) => face.wedding_id !== weddingId);
  if (hasFaceMismatch) {
    throw new Error('נתוני הפנים כוללים wedding_id שגוי');
  }

  const hasClusterMismatch = clusters.some((cluster) => cluster.wedding_id !== weddingId);
  if (hasClusterMismatch) {
    throw new Error('נתוני הקלאסטרים כוללים wedding_id שגוי');
  }
}

export async function saveFaceScan(payload: PersistFaceScanPayload): Promise<void> {
  await ensureFaceRecognitionSchema();

  const { weddingId, scanVersion, modelVersion, faces, clusters } = payload;

  assertWeddingScope(weddingId, faces, clusters);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (faces.length === 0) {
      await client.query(
        `DELETE FROM photo_faces
          WHERE wedding_id = $1
            AND scan_version = $2
            AND model_version = $3`,
        [weddingId, scanVersion, modelVersion],
      );

      await client.query(
        `DELETE FROM face_clusters
          WHERE wedding_id = $1
            AND scan_version = $2
            AND model_version = $3`,
        [weddingId, scanVersion, modelVersion],
      );

      await client.query('COMMIT');
      return;
    }

    const scannedPhotoIds = Array.from(new Set(faces.map((face) => face.photo_id)));

    if (scannedPhotoIds.length > 0) {
      await client.query(
        `DELETE FROM photo_faces
          WHERE wedding_id = $1
            AND scan_version = $2
            AND model_version = $3
            AND photo_id = ANY($4::uuid[])`,
        [weddingId, scanVersion, modelVersion, scannedPhotoIds],
      );
    }

    await client.query(
      `DELETE FROM face_clusters
        WHERE wedding_id = $1
          AND scan_version = $2
          AND model_version = $3`,
      [weddingId, scanVersion, modelVersion],
    );

    for (const cluster of clusters) {
      await client.query(
        `INSERT INTO face_clusters (
           id,
           wedding_id,
           representative_photo_id,
           representative_face_id,
           face_count,
           photo_count,
           centroid_embedding,
           confidence,
           scan_version,
           model_version
         )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          cluster.id,
          cluster.wedding_id,
          cluster.representative_photo_id,
          null,
          cluster.face_count,
          cluster.photo_count,
          cluster.centroid_embedding,
          cluster.confidence,
          scanVersion,
          modelVersion,
        ],
      );
    }

    for (const face of faces) {
      await client.query(
        `INSERT INTO photo_faces (
           id,
           wedding_id,
           photo_id,
           cluster_id,
           bounding_box,
           embedding,
           confidence,
           source_width,
           source_height,
           scan_version,
           model_version
         )
         VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9,$10,$11)`,
        [
          face.id,
          face.wedding_id,
          face.photo_id,
          face.cluster_id,
          JSON.stringify(face.bounding_box),
          face.embedding,
          face.confidence,
          face.source_width,
          face.source_height,
          scanVersion,
          modelVersion,
        ],
      );
    }

    for (const cluster of clusters) {
      await client.query(
        `UPDATE face_clusters
            SET representative_face_id = $1,
                updated_at = NOW()
          WHERE id = $2
            AND wedding_id = $3`,
        [cluster.representative_face_id, cluster.id, weddingId],
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getClustersByWedding(weddingId: number): Promise<{
  id: string;
  weddingId: number;
  representativeFace: PhotoFaceRow | null;
  faces: PhotoFaceRow[];
  photoIds: string[];
  faceCount: number;
  photoCount: number;
}[]> {
  await ensureFaceRecognitionSchema();

  const { rows: clusters } = await pool.query<FaceClusterRow>(
    `SELECT id, wedding_id, representative_photo_id, representative_face_id, face_count, photo_count, confidence
       FROM face_clusters
      WHERE wedding_id = $1
      ORDER BY face_count DESC, created_at ASC`,
    [weddingId],
  );

  if (clusters.length === 0) {
    return [];
  }

  const clusterIds = clusters.map((cluster) => cluster.id);

  const { rows: faces } = await pool.query<PhotoFaceRow>(
    `SELECT id, photo_id, cluster_id, bounding_box, confidence, source_width, source_height
       FROM photo_faces
      WHERE wedding_id = $1
        AND cluster_id = ANY($2::text[])
      ORDER BY created_at ASC`,
    [weddingId, clusterIds],
  );

  const facesByCluster = new Map<string, PhotoFaceRow[]>();
  for (const face of faces) {
    if (!face.cluster_id) {
      continue;
    }
    const list = facesByCluster.get(face.cluster_id) ?? [];
    list.push(face);
    facesByCluster.set(face.cluster_id, list);
  }

  return clusters.map((cluster) => {
    const members = facesByCluster.get(cluster.id) ?? [];
    const representative = members.find((member) => member.id === cluster.representative_face_id) ?? members[0] ?? null;
    const photoIds = Array.from(new Set(members.map((member) => member.photo_id)));

    return {
      id: cluster.id,
      weddingId: cluster.wedding_id,
      representativeFace: representative,
      faces: members,
      photoIds,
      faceCount: members.length,
      photoCount: photoIds.length,
    };
  });
}

export async function deleteFaceDataByWedding(weddingId: number): Promise<void> {
  await ensureFaceRecognitionSchema();

  await pool.query('DELETE FROM photo_faces WHERE wedding_id = $1', [weddingId]);
  await pool.query('DELETE FROM face_clusters WHERE wedding_id = $1', [weddingId]);
}
