import { pool } from '../db/pool';
import { Guest } from '../types';
import { createError } from '../middleware/errorHandler';

/**
 * Authenticate a user:
 * - role='couple' → last 4 chars of their UUID
 * - role='guest'  → last 4 digits of their phone
 */
export async function loginGuest(
  fullName: string,
  lastFourDigits: string,
  weddingId: number,
): Promise<Pick<Guest, 'id' | 'full_name' | 'table_number' | 'side' | 'role' | 'rsvp_status' | 'number_of_guests' | 'rsvp_updated_at'>> {
  const code = lastFourDigits.trim();

  // Try couple first (password = last 4 chars of UUID, letters a-f mapped to 1-6)
  const coupleResult = await pool.query<Guest>(
    `SELECT id, full_name, table_number, side, role, rsvp_status, number_of_guests, rsvp_updated_at
       FROM guests
      WHERE wedding_id = $3 AND full_name = $1
        AND role = 'couple'
        AND TRANSLATE(RIGHT(id::text, 4), 'abcdef', '123456') = $2
      LIMIT 1`,
    [fullName.trim(), code, weddingId],
  );
  if (coupleResult.rows.length > 0) return coupleResult.rows[0];

  // Then try guest (password = last 4 digits of phone)
  const guestResult = await pool.query<Guest>(
    `SELECT id, full_name, table_number, side, role, rsvp_status, number_of_guests, rsvp_updated_at
       FROM guests
      WHERE wedding_id = $3 AND full_name = $1
        AND role = 'guest'
        AND RIGHT(phone, 4) = $2
      LIMIT 1`,
    [fullName.trim(), code, weddingId],
  );
  if (guestResult.rows.length > 0) return guestResult.rows[0];

  throw createError('שם מלא או קוד שגויים', 401);
}
