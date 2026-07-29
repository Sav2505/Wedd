import { pool } from '../db/pool';
import { WeddingInfo } from '../types';

export async function getWeddingInfo(): Promise<WeddingInfo> {
  const { rows } = await pool.query<WeddingInfo>(
    'SELECT * FROM wedding_info WHERE id = 1 LIMIT 1',
  );
  if (rows.length === 0) {
    throw new Error('פרטי החתונה לא נמצאו');
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
  >
>;

export async function updateWeddingInfo(data: WeddingInfoUpdate): Promise<WeddingInfo> {
  const allowed = [
    'bride_name', 'groom_name', 'wedding_date', 'wedding_time', 'wedding_canpoy_time',
    'venue_name', 'venue_address', 'venue_lat', 'venue_lng',
    'dress_code', 'notes', 'message', 'stage_label', 'is_tables_published',
  ] as const;

  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const key of allowed) {
    if (key in data && data[key] !== undefined) {
      sets.push(`${key} = $${idx++}`);
      values.push(data[key]);
    }
  }

  if (sets.length === 0) throw new Error('אין שדות לעדכון');

  sets.push(`updated_at = NOW()`);
  values.push(1); // WHERE id = $N

  const { rows } = await pool.query<WeddingInfo>(
    `UPDATE wedding_info SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    values,
  );

  return rows[0];
}

export async function updateHeroImage(filename: string): Promise<WeddingInfo> {
  const heroUrl = `/uploads/${filename}`;
  const { rows } = await pool.query<WeddingInfo>(
    `UPDATE wedding_info SET hero_image_url = $1, updated_at = NOW() WHERE id = 1 RETURNING *`,
    [heroUrl],
  );
  return rows[0];
}

export async function updatePublishTables(toPublishTables: boolean): Promise<WeddingInfo> {
  const { rows } = await pool.query<WeddingInfo>(
    `UPDATE wedding_info SET is_tables_published = $1, updated_at = NOW() WHERE id = 1 RETURNING *`,
    [toPublishTables],
  );
  return rows[0];
}