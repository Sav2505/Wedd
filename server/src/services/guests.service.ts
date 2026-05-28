import { pool } from '../db/pool';
import { createError } from '../middleware/errorHandler';
import { GuestGroup, ManagedGuest } from '../types';

function compactName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, ' ').trim();
}

export async function listGuestGroups(): Promise<Array<GuestGroup & { guest_count: number }>> {
  const { rows } = await pool.query<Array<GuestGroup & { guest_count: number }>[number]>(`
    SELECT
      gg.id,
      gg.name,
      gg.created_at,
      COUNT(g.id)::int AS guest_count
    FROM guest_groups gg
    LEFT JOIN guests g ON g.guest_group_id = gg.id AND g.role = 'guest'
    GROUP BY gg.id
    ORDER BY gg.created_at ASC
  `);

  return rows;
}

export async function createGuestGroup(name: string): Promise<GuestGroup> {
  const cleanName = name.trim();
  if (!cleanName) throw createError('שם קבוצה הוא שדה חובה', 400);

  const { rows } = await pool.query<GuestGroup>(
    'INSERT INTO guest_groups (name) VALUES ($1) RETURNING *',
    [cleanName],
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

export async function listGuests(query?: string): Promise<ManagedGuest[]> {
  const where = query?.trim()
    ? `
      WHERE g.role = 'guest'
        AND (
          g.full_name ILIKE $1
          OR g.phone ILIKE $1
          OR COALESCE(gg.name, '') ILIKE $1
        )
    `
    : `WHERE g.role = 'guest'`;

  const params = query?.trim() ? [`%${query.trim()}%`] : [];

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
      g.created_at
    FROM guests g
    LEFT JOIN guest_groups gg ON gg.id = g.guest_group_id
    ${where}
    ORDER BY gg.name NULLS LAST, g.full_name ASC
  `, params);

  return rows;
}

export async function createGuest(payload: {
  first_name: string;
  last_name: string;
  phone: string;
  side?: 'חתן' | 'כלה' | 'שניהם' | null;
  guest_group_id?: string | null;
  plus_count?: number;
}): Promise<ManagedGuest> {
  const firstName = payload.first_name.trim();
  const lastName = payload.last_name.trim();
  const phone = payload.phone.trim();

  if (!firstName || !lastName) throw createError('שם פרטי ושם משפחה הם שדות חובה', 400);
  if (!phone) throw createError('מספר טלפון הוא שדה חובה', 400);

  const fullName = compactName(firstName, lastName);
  const plusCount = Math.max(0, Math.floor(payload.plus_count ?? 0));

  const { rows } = await pool.query<ManagedGuest>(`
    INSERT INTO guests (
      full_name, first_name, last_name, phone, side, role, guest_group_id, plus_count
    )
    VALUES ($1, $2, $3, $4, $5, 'guest', $6, $7)
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
      created_at
  `, [fullName, firstName, lastName, phone, payload.side ?? null, payload.guest_group_id ?? null, plusCount]);

  return rows[0];
}

export async function updateGuest(id: string, payload: {
  first_name?: string;
  last_name?: string;
  phone?: string;
  side?: 'חתן' | 'כלה' | 'שניהם' | null;
  guest_group_id?: string | null;
  plus_count?: number;
}): Promise<ManagedGuest> {
  const current = await pool.query<{
    first_name: string | null;
    last_name: string | null;
    full_name: string;
    phone: string;
    side: 'חתן' | 'כלה' | 'שניהם' | null;
    guest_group_id: string | null;
  }>(
    "SELECT first_name, last_name, full_name, phone, side, guest_group_id FROM guests WHERE id = $1 AND role = 'guest'",
    [id],
  );

  if (current.rows.length === 0) throw createError('אורח לא נמצא', 404);

  const now = current.rows[0];
  const firstName = (payload.first_name ?? now.first_name ?? '').trim() || splitFirst(now.full_name);
  const lastName = (payload.last_name ?? now.last_name ?? '').trim() || splitLast(now.full_name);
  const phone = (payload.phone ?? now.phone).trim();
  const side = payload.side === undefined ? now.side : payload.side;
  const groupId = payload.guest_group_id === undefined ? now.guest_group_id : payload.guest_group_id;
  const plusCount = payload.plus_count !== undefined ? Math.max(0, Math.floor(payload.plus_count)) : undefined;

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
      plus_count = COALESCE($7, plus_count)
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
      created_at
  `, [firstName, lastName, fullName, phone, side ?? null, groupId ?? null, plusCount ?? null, id]);

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

function splitFirst(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? '';
}

function splitLast(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(' ') : '';
}
