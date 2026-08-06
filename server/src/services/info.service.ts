import { pool } from '../db/pool';
import { createError } from '../middleware/errorHandler';
import { WeddingInfo } from '../types';

const MIN_TABLE_SCALE_FACTOR = 0.5;
const MAX_TABLE_SCALE_FACTOR = 1.3;

function clampTableScaleFactor(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(MIN_TABLE_SCALE_FACTOR, Math.min(MAX_TABLE_SCALE_FACTOR, parsed));
}

export async function getWeddingInfoByGuestId(
  guestId: string,
): Promise<WeddingInfo> {

  const { rows } = await pool.query<WeddingInfo>(
    `
    SELECT wi.*
    FROM guests g
    JOIN wedding_info wi
      ON wi.id = g.wedding_id
    WHERE g.id = $1
    LIMIT 1
    `,
    [guestId],
  );

  if (rows.length === 0) {
    throw createError('פרטי החתונה לא נמצאו', 404);
  }

  return rows[0];
}

export async function getWeddingInfoByWeddingId(
  weddingId: number,
): Promise<WeddingInfo> {

  const { rows } = await pool.query<WeddingInfo>(
    `
    SELECT * FROM wedding_info WHERE id = $1;
    `,
    [weddingId],
  );

  if (rows.length === 0) {
    throw createError('פרטי החתונה לא נמצאו', 404);
  }

  return rows[0];
}

export type WeddingInfoUpdate = Partial<
  Pick<
    WeddingInfo,
    | 'bride_name'
    | 'groom_name'
    | 'wedding_date'
    | 'wedding_time'
    | 'wedding_canpoy_time'
    | 'venue_name'
    | 'venue_address'
    | 'venue_lat'
    | 'venue_lng'
    | 'dress_code'
    | 'notes'
    | 'message'
    | 'stage_label'
    | 'is_tables_published'
    | 'table_scale_factor'
    | 'bride_bit_url'
    | 'groom_bit_url'
  >
>;

/**
 * IMPORTANT: weddingId is now a REQUIRED parameter, not hardcoded.
 * Previously this always wrote to `WHERE id = 1`, meaning every couple
 * in the system - regardless of which wedding they were editing - had
 * their changes silently written to wedding #1, overwriting each other.
 */
export async function updateWeddingInfo(
  data: WeddingInfoUpdate,
  weddingId: number,
): Promise<WeddingInfo> {
  const allowed = [
    'bride_name', 'groom_name', 'wedding_date', 'wedding_time', 'wedding_canpoy_time',
    'venue_name', 'venue_address', 'venue_lat', 'venue_lng',
    'dress_code', 'notes', 'message', 'stage_label', 'is_tables_published', 'table_scale_factor',
    'bride_bit_url', 'groom_bit_url',
  ] as const;

  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const key of allowed) {
    if (key in data && data[key] !== undefined) {
      let value = data[key];

      if (
        (key === 'wedding_time' || key === 'wedding_canpoy_time') &&
        value === ''
      ) {
        value = null;
      }

      if (
        (key === 'bride_bit_url' || key === 'groom_bit_url') &&
        typeof value === 'string' &&
        value.trim() === ''
      ) {
        value = null;
      }

      if (key === 'table_scale_factor') {
        value = clampTableScaleFactor(value);
      }

      sets.push(`${key} = $${idx++}`);
      values.push(value);
    }
  }

  if (sets.length === 0) throw new Error('אין שדות לעדכון');

  sets.push(`updated_at = NOW()`);
  values.push(weddingId); // WHERE id = $N — now the REAL wedding id, not a constant

  const { rows } = await pool.query<WeddingInfo>(
    `UPDATE wedding_info SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    values,
  );

  if (rows.length === 0) {
    throw createError('פרטי החתונה לא נמצאו', 404);
  }

  return rows[0];
}

/**
 * IMPORTANT: weddingId is now a REQUIRED parameter, not hardcoded to `id = 1`.
 */
export async function updateHeroImage(filename: string, weddingId: number): Promise<WeddingInfo> {
  const heroUrl = `/uploads/${filename}`;
  const { rows } = await pool.query<WeddingInfo>(
    `UPDATE wedding_info SET hero_image_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [heroUrl, weddingId],
  );

  if (rows.length === 0) {
    throw createError('פרטי החתונה לא נמצאו', 404);
  }

  return rows[0];
}

export async function updatePublishTables(toPublishTables: boolean, weddingId: number): Promise<WeddingInfo> {
  const { rows } = await pool.query<WeddingInfo>(
    `UPDATE wedding_info SET is_tables_published = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [toPublishTables, weddingId],
  );

  if (rows.length === 0) {
    throw createError('פרטי החתונה לא נמצאו', 404);
  }

  return rows[0];
}