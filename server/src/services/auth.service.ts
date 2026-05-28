import { pool } from '../db/pool';
import { Guest } from '../types';
import { createError } from '../middleware/errorHandler';

/**
 * Authenticate a guest by full_name + last 4 digits of phone.
 * Returns the guest row on success, throws a 401 on mismatch.
 */
export async function loginGuest(
  fullName: string,
  lastFourDigits: string,
): Promise<Pick<Guest, 'id' | 'full_name' | 'table_number' | 'side' | 'role'>> {
  const { rows } = await pool.query<Guest>(
    `SELECT id, full_name, table_number, side, role
       FROM guests
      WHERE full_name = $1
        AND RIGHT(phone, 4) = $2
      LIMIT 1`,
    [fullName.trim(), lastFourDigits.trim()],
  );

  if (rows.length === 0) {
    throw createError('שם מלא או 4 ספרות אחרונות של טלפון שגויים', 401);
  }

  return rows[0];
}
