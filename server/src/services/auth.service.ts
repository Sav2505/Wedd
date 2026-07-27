import { pool } from '../db/pool';
import { Guest } from '../types';
import { createError } from '../middleware/errorHandler';

function normalizeCoupleCodeSegment(segment: string): string {
  return segment
    .toLowerCase()
    .replace(/a/g, '1')
    .replace(/b/g, '2')
    .replace(/c/g, '3')
    .replace(/d/g, '4')
    .replace(/e/g, '5')
    .replace(/f/g, '6');
}

export function generateCoupleLoginCodeFromGuestId(guestId: string): string {
  const lastFour = guestId.trim().slice(-4);
  return normalizeCoupleCodeSegment(lastFour);
}

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

  // Try guest first (password = last 4 digits of phone)
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

  // Then couple first (password = last 4 chars of UUID, letters a-f mapped to 1-6)
  const coupleResult = await pool.query<Guest>(
    `SELECT id, full_name, table_number, side, role, rsvp_status, number_of_guests, rsvp_updated_at
       FROM guests
      WHERE wedding_id = $3 AND full_name = $1
        AND role = 'couple'
        AND TRANSLATE(LOWER(RIGHT(id::text, 4)), 'abcdef', '123456') = $2
      LIMIT 1`,
    [fullName.trim(), code, weddingId],
  );
  if (coupleResult.rows.length > 0) return coupleResult.rows[0];


  throw createError('שם מלא או קוד שגויים', 401);
}

export async function loginGroomOrBride(
  fullName: string,
  lastFourDigits: string
): Promise<Pick<Guest, 'id' | 'full_name' | 'table_number' | 'side' | 'role' | 'rsvp_status' | 'number_of_guests' | 'rsvp_updated_at'>> {
  const code = lastFourDigits.trim();

  // Try couple first (password = last 4 chars of UUID, letters a-f mapped to 1-6)
  const coupleResult = await pool.query<Guest>(
    `SELECT id, full_name, table_number, side, role, rsvp_status, number_of_guests, rsvp_updated_at
       FROM guests
      WHERE full_name = $1
        AND role = 'couple'
        AND TRANSLATE(LOWER(RIGHT(id::text, 4)), 'abcdef', '123456') = $2
      LIMIT 1`,
    [fullName.trim(), code],
  );
  if (coupleResult.rows.length > 0) return coupleResult.rows[0];

  // Then try guest (password = last 4 digits of phone)
  const guestResult = await pool.query<Guest>(
    `SELECT id, full_name, table_number, side, role, rsvp_status, number_of_guests, rsvp_updated_at
       FROM guests
      WHERE full_name = $1
        AND role = 'guest'
        AND RIGHT(phone, 4) = $2
      LIMIT 1`,
    [fullName.trim(), code],
  );
  if (guestResult.rows.length > 0) return guestResult.rows[0];

  throw createError('שם מלא או קוד שגויים', 401);
}
