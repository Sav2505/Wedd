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

type LoginResult = Pick<
  Guest,
  'id' | 'full_name' | 'table_number' | 'side' | 'role' | 'rsvp_status' | 'number_of_guests' | 'rsvp_updated_at' | `wedding_id`
>;

const SELECT_FIELDS = `id, full_name, table_number, side, role, rsvp_status, number_of_guests, rsvp_updated_at, wedding_id`;

/**
 * Throws a clear, generic-safe error if more than one row matched.
 * We never leak *which* row would have been picked - ambiguity itself
 * is treated as an auth failure the user (or support) must resolve.
 */
function assertNotAmbiguous(rows: unknown[], context: string): void {
  if (rows.length > 1) {
    // Log server-side for investigation; don't leak details to the client.
    console.error(`[auth] Ambiguous login match (${context}): ${rows.length} rows`);
    throw createError('לא ניתן להתחבר, אנא פנה לתמיכה', 409);
  }
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
): Promise<LoginResult> {
  const code = lastFourDigits.trim();
  const name = fullName.trim();

  // Try guest first (password = last 4 digits of phone)
  const guestResult = await pool.query<Guest>(
    `SELECT ${SELECT_FIELDS}
       FROM guests
      WHERE wedding_id = $3 AND full_name = $1
        AND role = 'guest'
        AND RIGHT(phone, 4) = $2
      ORDER BY id
      LIMIT 2`,
    [name, code, weddingId],
  );
  assertNotAmbiguous(guestResult.rows, 'loginGuest/guest');
  if (guestResult.rows.length === 1) return guestResult.rows[0];

  // Then couple (password = last 4 chars of UUID, letters a-f mapped to 1-6)
  const coupleResult = await pool.query<Guest>(
    `SELECT ${SELECT_FIELDS}
       FROM guests
      WHERE wedding_id = $3 AND full_name = $1
        AND role = 'couple'
        AND TRANSLATE(LOWER(RIGHT(id::text, 4)), 'abcdef', '123456') = $2
      ORDER BY id
      LIMIT 2`,
    [name, code, weddingId],
  );
  assertNotAmbiguous(coupleResult.rows, 'loginGuest/couple');
  if (coupleResult.rows.length === 1) return coupleResult.rows[0];

  throw createError('שם מלא או קוד שגויים', 401);
}

/**
 * Couple (groom/bride) login.
 *
 * weddingId is OPTIONAL here on purpose: a couple may log in from a
 * wedding-specific link (which carries weddingId, e.g. `?p=`) OR from
 * the generic /login page by typing their name + code manually
 * (no weddingId available at all).
 *
 * - If weddingId IS provided → always filter by it (safer, scoped).
 * - If weddingId is NOT provided → search globally, but hard-fail on
 *   any ambiguity (more than one match) instead of silently picking one.
 */
export async function loginGroomOrBride(
  fullName: string,
  lastFourDigits: string,
  weddingId?: number,
): Promise<LoginResult> {
  const code = lastFourDigits.trim();
  const name = fullName.trim();

  const coupleParams: unknown[] = [name, code];
  const coupleWeddingClause = weddingId != null ? 'AND wedding_id = $3' : '';
  if (weddingId != null) coupleParams.push(weddingId);

  const coupleResult = await pool.query<Guest>(
    `SELECT ${SELECT_FIELDS}
       FROM guests
      WHERE full_name = $1
        AND role = 'couple'
        AND TRANSLATE(LOWER(RIGHT(id::text, 4)), 'abcdef', '123456') = $2
        ${coupleWeddingClause}
      ORDER BY id
      LIMIT 2`,
    coupleParams,
  );
  assertNotAmbiguous(coupleResult.rows, 'loginGroomOrBride/couple');
  if (coupleResult.rows.length === 1) return coupleResult.rows[0];

  const guestParams: unknown[] = [name, code];
  const guestWeddingClause = weddingId != null ? 'AND wedding_id = $3' : '';
  if (weddingId != null) guestParams.push(weddingId);

  const guestResult = await pool.query<Guest>(
    `SELECT ${SELECT_FIELDS}
       FROM guests
      WHERE full_name = $1
        AND role = 'guest'
        AND RIGHT(phone, 4) = $2
        ${guestWeddingClause}
      ORDER BY id
      LIMIT 2`,
    guestParams,
  );
  assertNotAmbiguous(guestResult.rows, 'loginGroomOrBride/guest');
  if (guestResult.rows.length === 1) return guestResult.rows[0];

  throw createError('שם מלא או קוד שגויים', 401);
}