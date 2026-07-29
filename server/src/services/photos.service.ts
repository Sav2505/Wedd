import { pool } from '../db/pool';
import { Photo } from '../types';
import { createError } from '../middleware/errorHandler';

/** Return all photos, newest first, with uploader name joined.
 *  url is computed as /api/photos/:id/thumb for binary photos,
 *  or the legacy filesystem URL for older disk-stored photos. */
export async function getAllPhotos(weddingId: number): Promise<(Photo & { url: string })[]> {
  const { rows } = await pool.query<Photo>(
    `SELECT 
        p.id,
        p.uploader_id,
        g.full_name AS uploader_name,
        p.url,
        p.caption,
        p.uploaded_at,
        p.mime_type,
        (p.thumbnail_data IS NOT NULL) AS has_binary
     FROM photos p
     JOIN guests g ON g.id = p.uploader_id
     WHERE p.wedding_id = $1
     ORDER BY p.uploaded_at DESC`,
    [weddingId],
  );

  return rows.map((r) => ({
    ...r,
    url: (r as any).has_binary
      ? `/photos/${r.id}/thumb`
      : (r.url ?? ''),
  }));
}

/** Persist a newly uploaded binary photo to the DB */
export async function savePhoto(
  weddingId: number,
  uploaderId: string,
  thumbBuffer: Buffer,
  fullBuffer: Buffer,
  mimeType: string,
  caption?: string,
): Promise<Photo & { url: string }> {
  const { rows } = await pool.query<Photo>(
    `
      INSERT INTO photos 
      (
      wedding_id,
      uploader_id,
      url,
      caption,
      thumbnail_data,
      full_data,
      mime_type
      )
      VALUES ($1, $2, NULL, $3, $4, $5, $6)

      RETURNING id, uploader_id, url, caption, uploaded_at, mime_type
      `,
    [
      weddingId,
      uploaderId,
      caption ?? null,
      thumbBuffer,
      fullBuffer,
      mimeType,
    ],
  );
  const row = rows[0];
  return { ...row, url: `/photos/${row.id}/thumb` };
}

/** Fetch raw binary data for thumb or full resolution */
export async function getPhotoData(
  photoId: string,
  size: 'thumb' | 'full',
): Promise<{ data: Buffer; mimeType: string } | null> {
  const col = size === 'thumb' ? 'thumbnail_data' : 'full_data';
  const { rows } = await pool.query<{ data: Buffer; mime_type: string }>(
    `SELECT ${col} AS data, mime_type FROM photos WHERE id = $1 LIMIT 1`,
    [photoId],
  );
  if (rows.length === 0 || !rows[0].data) return null;
  return { data: rows[0].data, mimeType: rows[0].mime_type ?? 'image/jpeg' };
}

/** Delete a photo — only the uploader may delete their own */
export async function deletePhoto(photoId: string, requesterId: string): Promise<void> {
  const { rows } = await pool.query<Pick<Photo, 'id' | 'uploader_id'>>(
    'SELECT id, uploader_id FROM photos WHERE id = $1 LIMIT 1',
    [photoId],
  );
  if (rows.length === 0) throw createError('תמונה לא נמצאה', 404);

  const photo = rows[0];
  if (photo.uploader_id !== requesterId) {
    throw createError('אין הרשאה למחוק תמונה זו', 403);
  }

  await pool.query('DELETE FROM photos WHERE id = $1', [photoId]);
}

