import path from 'path';
import fs from 'fs';
import { pool } from '../db/pool';
import { Photo } from '../types';
import { createError } from '../middleware/errorHandler';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? 'uploads';

/** Return all photos, newest first, with uploader name joined */
export async function getAllPhotos(): Promise<Photo[]> {
  const { rows } = await pool.query<Photo>(
    `SELECT p.id, p.uploader_id, g.full_name AS uploader_name,
            p.url, p.caption, p.uploaded_at
       FROM photos p
       JOIN guests g ON g.id = p.uploader_id
      ORDER BY p.uploaded_at DESC`,
  );
  return rows;
}

/** Persist a newly uploaded file to the DB */
export async function savePhoto(
  uploaderId: string,
  filename: string,
  caption?: string,
): Promise<Photo> {
  const url = `/uploads/${filename}`;
  const { rows } = await pool.query<Photo>(
    `INSERT INTO photos (uploader_id, url, caption)
          VALUES ($1, $2, $3)
       RETURNING id, uploader_id, url, caption, uploaded_at`,
    [uploaderId, url, caption ?? null],
  );
  return rows[0];
}

/** Delete a photo by id — only the uploader may delete their own */
export async function deletePhoto(photoId: string, requesterId: string): Promise<void> {
  const { rows } = await pool.query<Photo>(
    'SELECT id, uploader_id, url FROM photos WHERE id = $1 LIMIT 1',
    [photoId],
  );
  if (rows.length === 0) throw createError('תמונה לא נמצאה', 404);

  const photo = rows[0];
  if (photo.uploader_id !== requesterId) {
    throw createError('אין הרשאה למחוק תמונה זו', 403);
  }

  // Remove physical file
  const filePath = path.join(UPLOAD_DIR, path.basename(photo.url));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  await pool.query('DELETE FROM photos WHERE id = $1', [photoId]);
}
