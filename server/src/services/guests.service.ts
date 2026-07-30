import { pool } from '../db/pool';
import { createError } from '../middleware/errorHandler';
import { GuestGroup, ManagedGuest, RsvpStatus } from '../types';

export interface GuestRsvpDetails {
  id: string;
  rsvp_status: RsvpStatus;
  number_of_guests: number;
  rsvp_updated_at: string | null;
}

function compactName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, ' ').trim();
}

/** Strip invisible Unicode directional/formatting characters (often pasted from WhatsApp/contacts) */
function sanitizePhone(phone: string): string {
  return phone.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, '').trim();
}

export async function listGuestGroups(
  weddingId: number,
): Promise<Array<GuestGroup & { guest_count: number }>> {

  const { rows } = await pool.query<Array<GuestGroup & { guest_count: number }>[number]>(
    `
    SELECT
      gg.id,
      gg.name,
      gg.created_at,
      COUNT(g.id)::int AS guest_count
    FROM guest_groups gg
    LEFT JOIN guests g
      ON g.guest_group_id = gg.id
      AND g.role = 'guest'
      AND g.wedding_id = $1
    WHERE gg.wedding_id = $1
    GROUP BY gg.id
    ORDER BY gg.created_at ASC
    `,
    [weddingId],
  );

  return rows;
}

export async function createGuestGroup(name: string, wedding_id: number): Promise<GuestGroup> {
  const cleanName = name.trim();
  if (!cleanName) throw createError('שם קבוצה הוא שדה חובה', 400);

  const { rows } = await pool.query<GuestGroup>(
    'INSERT INTO guest_groups (name, wedding_id) VALUES ($1, $2) RETURNING *',
    [cleanName, wedding_id],
  );

  return rows[0];
}

export async function updateGuestGroup(id: string, name: string): Promise<GuestGroup> {
  const cleanName = name.trim();
  if (!cleanName) throw createError('שם קבוצה הוא שדה חובה', 400);

  const { rows } = await pool.query<GuestGroup>(
    'UPDATE guest_groups SET name = $1 WHERE id = $2 RETURNING *',
    [cleanName, id],
  );

  if (rows.length === 0) throw createError('קבוצה לא נמצאה', 404);
  return rows[0];
}

export async function deleteGuestGroup(id: string): Promise<void> {
  await pool.query('UPDATE guests SET guest_group_id = NULL WHERE guest_group_id = $1', [id]);
  await pool.query('DELETE FROM guest_groups WHERE id = $1', [id]);
}

export async function listGuests(
  weddingId: number,
  query?: string,
): Promise<ManagedGuest[]> {
  const where = query?.trim()
    ? `
    WHERE g.wedding_id = $1
      AND g.role = 'guest'
      AND (
        g.full_name ILIKE $2
        OR g.phone ILIKE $2
        OR COALESCE(gg.name, '') ILIKE $2
      )
  `
    : `
    WHERE g.wedding_id = $1
      AND g.role = 'guest'
  `;

  const params = query?.trim()
    ? [weddingId, `%${query.trim()}%`]
    : [weddingId];

  const { rows } = await pool.query<ManagedGuest>(`
  SELECT
    g.id,
    COALESCE(NULLIF(g.first_name, ''), split_part(g.full_name, ' ', 1)) AS first_name,
    COALESCE(
      NULLIF(g.last_name, ''),
      NULLIF(trim(substr(g.full_name, length(split_part(g.full_name, ' ', 1)) + 1)), ''),
      ''
    ) AS last_name,
    g.full_name,
    g.phone,
    g.side,
    g.table_number,
    g.guest_group_id,
    gg.name AS group_name,
    g.plus_count,
    g.rsvp_status,
    g.number_of_guests,
    g.rsvp_updated_at,
    g.created_at,
    g.gift_amount
  FROM guests g
  LEFT JOIN guest_groups gg ON gg.id = g.guest_group_id
  ${where}
  ORDER BY gg.name NULLS LAST, g.full_name ASC
`, params);

  return rows;
}

export async function createGuest(payload: {
  wedding_id: number;
  first_name: string;
  last_name: string;
  phone: string;
  side?: 'חתן' | 'כלה' | 'שניהם' | null;
  guest_group_id?: string | null;
  plus_count?: number;
  gift_amount?: number | null;
}): Promise<ManagedGuest> {
  const firstName = payload.first_name.trim();
  const lastName = payload.last_name.trim();
  const phone = sanitizePhone(payload.phone);
  const giftAmount = payload.gift_amount ?? null;

  if (!firstName || !lastName) throw createError('שם פרטי ושם משפחה הם שדות חובה', 400);
  if (!phone) throw createError('מספר טלפון הוא שדה חובה', 400);

  // בדיקת כפילות: אותו wedding_id + טלפון + שם פרטי + שם משפחה
  const { rows: existing } = await pool.query(
    `SELECT id FROM guests
     WHERE wedding_id = $1
       AND phone = $2
       AND lower(first_name) = lower($3)
       AND lower(last_name) = lower($4)
     LIMIT 1`,
    [payload.wedding_id, phone, firstName, lastName]
  );

  if (existing.length > 0) {
    throw createError('אורח עם אותו שם וטלפון כבר קיים ברשימת האורחים', 409);
  }

  const fullName = compactName(firstName, lastName);
  const plusCount = Math.max(0, Math.floor(payload.plus_count ?? 0));

  const { rows } = await pool.query<ManagedGuest>(`
    INSERT INTO guests (
      wedding_id, full_name, first_name, last_name, phone, side, role, guest_group_id, plus_count, gift_amount
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'guest', $7, $8, $9)
    RETURNING
      id,
      first_name,
      last_name,
      full_name,
      phone,
      side,
      table_number,
      guest_group_id,
      NULL::text AS group_name,
      plus_count,
      rsvp_status,
      number_of_guests,
      rsvp_updated_at,
      created_at,
      gift_amount
  `, [payload.wedding_id, fullName, firstName, lastName, phone, payload.side ?? null, payload.guest_group_id ?? null, plusCount, giftAmount ?? null]);

  return rows[0];
}

export async function updateGuest(id: string, payload: {
  first_name?: string;
  last_name?: string;
  phone?: string;
  side?: 'חתן' | 'כלה' | 'שניהם' | null;
  guest_group_id?: string | null;
  plus_count?: number;
  gift_amount?: number | null;
}): Promise<ManagedGuest> {
  const current = await pool.query<{
    first_name: string | null;
    last_name: string | null;
    full_name: string;
    phone: string;
    side: 'חתן' | 'כלה' | 'שניהם' | null;
    guest_group_id: string | null;
    gift_amount: number | null;
  }>(
    "SELECT first_name, last_name, full_name, phone, side, guest_group_id, gift_amount FROM guests WHERE id = $1 AND role = 'guest'",
    [id],
  );

  if (current.rows.length === 0) throw createError('אורח לא נמצא', 404);

  const now = current.rows[0];
  const firstName = (payload.first_name ?? now.first_name ?? '').trim() || splitFirst(now.full_name);
  const lastName = (payload.last_name ?? now.last_name ?? '').trim() || splitLast(now.full_name);
  const phone = sanitizePhone(payload.phone ?? now.phone);
  const side = payload.side === undefined ? now.side : payload.side;
  const groupId = payload.guest_group_id === undefined ? now.guest_group_id : payload.guest_group_id;
  const plusCount = payload.plus_count !== undefined ? Math.max(0, Math.floor(payload.plus_count)) : undefined;
  const giftAmount = payload.gift_amount !== undefined ? payload.gift_amount : now.gift_amount;

  if (!firstName || !lastName) throw createError('שם פרטי ושם משפחה הם שדות חובה', 400);
  if (!phone) throw createError('מספר טלפון הוא שדה חובה', 400);

  const fullName = compactName(firstName, lastName);

  const { rows } = await pool.query<ManagedGuest>(`
    UPDATE guests
    SET
      first_name = $1,
      last_name = $2,
      full_name = $3,
      phone = $4,
      side = $5,
      guest_group_id = $6,
      plus_count = COALESCE($7, plus_count),
      gift_amount = $9
    WHERE id = $8 AND role = 'guest'
    RETURNING
      id,
      first_name,
      last_name,
      full_name,
      phone,
      side,
      table_number,
      guest_group_id,
      NULL::text AS group_name,
      plus_count,
      rsvp_status,
      number_of_guests,
      rsvp_updated_at,
      created_at,
      gift_amount
  `, [firstName, lastName, fullName, phone, side ?? null, groupId ?? null, plusCount ?? null, id, giftAmount]);

  if (rows.length === 0) throw createError('אורח לא נמצא', 404);
  return rows[0];
}

export async function deleteGuest(id: string): Promise<void> {
  const { rowCount } = await pool.query(
    "DELETE FROM guests WHERE id = $1 AND role = 'guest'",
    [id],
  );

  if (!rowCount) throw createError('אורח לא נמצא', 404);
}

export async function getGuestByGuestId(guestId: number): Promise<ManagedGuest> {
  const { rows } = await pool.query<ManagedGuest>(
    `
      SELECT *
      FROM guests
      WHERE id = $1
        AND role = 'guest'
      LIMIT 1
    `,
    [guestId],
  );

  if (rows.length === 0) throw createError('אורח לא נמצא', 404);
  return rows[0];
}

export async function getGuestRsvpById(guestId: string): Promise<GuestRsvpDetails> {
  const { rows } = await pool.query<GuestRsvpDetails>(
    `
      SELECT
        id,
        rsvp_status,
        number_of_guests,
        rsvp_updated_at
      FROM guests
      WHERE id = $1
        AND role = 'guest'
      LIMIT 1
    `,
    [guestId],
  );

  if (rows.length === 0) throw createError('אורח לא נמצא', 404);
  return rows[0];
}

export async function updateGuestRsvpById(
  guestId: string,
  payload: {
    rsvp_status: RsvpStatus;
    number_of_guests: number;
  },
): Promise<GuestRsvpDetails> {
  const normalizedCount = payload.rsvp_status === 'COMING' ? payload.number_of_guests : 1;

  const { rows } = await pool.query<GuestRsvpDetails>(
    `
      UPDATE guests
      SET
        rsvp_status = $1,
        number_of_guests = $2,
        rsvp_updated_at = NOW()
      WHERE id = $3
        AND role = 'guest'
      RETURNING id, rsvp_status, number_of_guests, rsvp_updated_at
    `,
    [payload.rsvp_status, normalizedCount, guestId],
  );

  if (rows.length === 0) throw createError('אורח לא נמצא', 404);
  return rows[0];
}

function splitFirst(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? '';
}

function splitLast(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(' ') : '';
}
