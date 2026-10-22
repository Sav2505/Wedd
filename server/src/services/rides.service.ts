import { pool } from '../db/pool';
import { createError } from '../middleware/errorHandler';

export type RideKind = 'offer' | 'request';
export type RideStatus = 'active' | 'full' | 'closed' | 'expired';

export interface RidePostInput {
  kind: RideKind;
  display_name: string;
  contact_phone: string;
  origin_text: string;
  time_from: string;
  time_to: string | null;
  seats_available: number | null;
  passenger_count: number | null;
  notes: string | null;
}

interface GuestContext {
  id: string;
  wedding_id: number;
  wedding_date: string;
}

interface RidePostRow extends Omit<RidePostInput, 'contact_phone'> {
  contact_phone: string | null;
  id: string;
  wedding_id: number;
  creator_guest_id: string;
  consented_at: string;
  status: RideStatus;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

interface RidePostView {
  id: string;
  kind: RideKind;
  display_name: string;
  contact_phone: string | null;
  origin_text: string;
  time_from: string;
  time_to: string | null;
  seats_available: number | null;
  passenger_count: number | null;
  notes: string | null;
  status: RideStatus;
  created_at: string;
  expires_at: string;
  is_mine: boolean;
  whatsapp_url: string | null;
}

function normalizeContactPhone(phone: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+') && !digits.startsWith('972')) {
    throw createError('מספר הטלפון אינו תקין', 400);
  }
  const nationalDigits = (digits.startsWith('972') ? digits.slice(3) : digits).replace(/^0/, '');
  if (!/^[1-9]\d{7,9}$/.test(nationalDigits)) {
    throw createError('מספר הטלפון אינו תקין', 400);
  }
  return `+972${nationalDigits}`;
}

function buildWhatsappUrl(row: RidePostRow, contactPhone: string): string {
  const phone = contactPhone.replace(/\D/g, '');
  const message = row.kind === 'offer'
    ? `היי ${row.display_name}, ראיתי את הצעת הנסיעה שלך לחתונה. יש אפשרות להצטרף מ${row.origin_text}?`
    : `היי ${row.display_name}, ראיתי שאת/ה מחפש/ת טרמפ מ${row.origin_text}. יש לי אפשרות להציע נסיעה.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function toView(row: RidePostRow, guestId: string): RidePostView {
  const isMine = row.creator_guest_id === guestId;
  return {
    id: row.id,
    kind: row.kind,
    display_name: row.display_name,
    contact_phone: isMine ? row.contact_phone : null,
    origin_text: row.origin_text,
    time_from: row.time_from.slice(0, 5),
    time_to: row.time_to?.slice(0, 5) ?? null,
    seats_available: row.seats_available,
    passenger_count: row.passenger_count,
    notes: row.notes,
    status: row.status,
    created_at: row.created_at,
    expires_at: row.expires_at,
    is_mine: isMine,
    whatsapp_url: !isMine && row.status === 'active' && row.contact_phone
      ? buildWhatsappUrl(row, row.contact_phone)
      : null,
  };
}

async function getGuestContext(guestId: string): Promise<GuestContext> {
  const { rows } = await pool.query<GuestContext>(
    `SELECT g.id, g.wedding_id, wi.wedding_date::text AS wedding_date
       FROM guests g
       JOIN wedding_info wi ON wi.id = g.wedding_id
      WHERE g.id = $1
      LIMIT 1`,
    [guestId],
  );
  if (!rows[0]) throw createError('משתמש לא נמצא', 404);
  return rows[0];
}

function validateInput(input: RidePostInput): RidePostInput {
  const displayName = input.display_name.trim();
  const originText = input.origin_text.trim();
  const notes = input.notes?.trim() || null;
  if (displayName.length < 2 || displayName.length > 80) {
    throw createError('השם צריך להכיל בין 2 ל־80 תווים', 400);
  }
  if (originText.length < 2 || originText.length > 120) {
    throw createError('נקודת המוצא צריכה להכיל בין 2 ל־120 תווים', 400);
  }
  if (notes && notes.length > 500) {
    throw createError('ההערות יכולות להכיל עד 500 תווים', 400);
  }
  if (!/^\d{2}:\d{2}$/.test(input.time_from)
    || (input.time_to !== null && !/^\d{2}:\d{2}$/.test(input.time_to))) {
    throw createError('שעת היציאה אינה תקינה', 400);
  }
  if (input.time_to && input.time_to < input.time_from) {
    throw createError('סוף טווח השעות צריך להיות אחרי תחילתו', 400);
  }
  if (input.kind === 'offer') {
    if (!Number.isInteger(input.seats_available) || (input.seats_available ?? 0) < 1 || (input.seats_available ?? 0) > 8) {
      throw createError('מספר המקומות צריך להיות בין 1 ל־8', 400);
    }
    if (input.passenger_count !== null) throw createError('מספר נוסעים מתאים לבקשת טרמפ בלבד', 400);
  } else if (input.kind === 'request') {
    if (!Number.isInteger(input.passenger_count) || (input.passenger_count ?? 0) < 1 || (input.passenger_count ?? 0) > 8) {
      throw createError('מספר הנוסעים צריך להיות בין 1 ל־8', 400);
    }
    if (input.seats_available !== null) throw createError('מספר מקומות מתאים להצעת נסיעה בלבד', 400);
  } else {
    throw createError('סוג הפרסום אינו תקין', 400);
  }

  return {
    ...input,
    display_name: displayName,
    contact_phone: normalizeContactPhone(input.contact_phone),
    origin_text: originText,
    notes,
  };
}

async function ensureWeddingIsUpcoming(weddingDate: string): Promise<void> {
  const { rows } = await pool.query<{ can_publish: boolean }>(
    `SELECT (($1::date + 1)::timestamp AT TIME ZONE 'Asia/Jerusalem') > NOW() AS can_publish`,
    [weddingDate],
  );
  if (!rows[0]?.can_publish) throw createError('אי אפשר לפרסם נסיעה אחרי מועד החתונה', 400);
}

export async function listRidePosts(guestId: string): Promise<RidePostView[]> {
  const guest = await getGuestContext(guestId);
  await pool.query(
    `UPDATE ride_posts
        SET status = 'expired', contact_phone = NULL, updated_at = NOW()
      WHERE wedding_id = $1 AND status <> 'expired' AND expires_at <= NOW()`,
    [guest.wedding_id],
  );
  const { rows } = await pool.query<RidePostRow>(
    `SELECT *
       FROM ride_posts
      WHERE wedding_id = $1
        AND (status IN ('active', 'full') OR creator_guest_id = $2)
      ORDER BY (creator_guest_id = $2) DESC, created_at DESC`,
    [guest.wedding_id, guestId],
  );
  return rows.map((row) => toView(row, guestId));
}

export async function createRidePost(guestId: string, rawInput: RidePostInput): Promise<RidePostView> {
  const input = validateInput(rawInput);
  const guest = await getGuestContext(guestId);
  await ensureWeddingIsUpcoming(guest.wedding_date);
  try {
    const { rows } = await pool.query<RidePostRow>(
      `INSERT INTO ride_posts (
         wedding_id, creator_guest_id, kind, display_name, contact_phone, origin_text,
         time_from, time_to, seats_available, passenger_count, notes, consented_at, expires_at
       )
       SELECT $1, $2, $3, $4, $5, $6, $7::time, $8::time, $9, $10, $11, NOW(),
              ((wi.wedding_date + 1)::timestamp AT TIME ZONE 'Asia/Jerusalem')
         FROM wedding_info wi
        WHERE wi.id = $1
       RETURNING *`,
      [guest.wedding_id, guestId, input.kind, input.display_name, input.contact_phone,
        input.origin_text, input.time_from, input.time_to, input.seats_available,
        input.passenger_count, input.notes],
    );
    return toView(rows[0], guestId);
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      throw createError('כבר יש לך פרסום פעיל מסוג זה', 409);
    }
    throw error;
  }
}

export async function updateRidePost(
  guestId: string,
  postId: string,
  rawInput: RidePostInput,
): Promise<RidePostView> {
  const input = validateInput(rawInput);
  const guest = await getGuestContext(guestId);
  await ensureWeddingIsUpcoming(guest.wedding_date);
  let rows: RidePostRow[];
  try {
    ({ rows } = await pool.query<RidePostRow>(
      `UPDATE ride_posts
          SET kind = $4, display_name = $5, contact_phone = $6, origin_text = $7,
              time_from = $8::time, time_to = $9::time, seats_available = $10,
              passenger_count = $11, notes = $12, consented_at = NOW(),
              status = CASE WHEN status = 'full' THEN 'active' ELSE status END,
              updated_at = NOW()
        WHERE id = $1 AND wedding_id = $2 AND creator_guest_id = $3
          AND status IN ('active', 'full') AND expires_at > NOW()
        RETURNING *`,
      [postId, guest.wedding_id, guestId, input.kind, input.display_name,
        input.contact_phone, input.origin_text, input.time_from, input.time_to,
        input.seats_available, input.passenger_count, input.notes],
    ));
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      throw createError('כבר יש לך פרסום פעיל מסוג זה', 409);
    }
    throw error;
  }
  if (!rows[0]) throw createError('הפרסום לא נמצא או שאינו ניתן לעריכה', 404);
  return toView(rows[0], guestId);
}

export async function updateRidePostStatus(
  guestId: string,
  postId: string,
  status: 'full' | 'closed',
): Promise<RidePostView> {
  const guest = await getGuestContext(guestId);
  const { rows } = await pool.query<RidePostRow>(
    `UPDATE ride_posts
        SET status = $4, updated_at = NOW()
      WHERE id = $1 AND wedding_id = $2 AND creator_guest_id = $3
        AND expires_at > NOW() AND status IN ('active', 'full')
        AND ($4 <> 'full' OR kind = 'offer')
      RETURNING *`,
    [postId, guest.wedding_id, guestId, status],
  );
  if (!rows[0]) throw createError('הפרסום לא נמצא או שאי אפשר לעדכן אותו', 404);
  return toView(rows[0], guestId);
}

export async function deleteRidePost(guestId: string, postId: string): Promise<void> {
  const guest = await getGuestContext(guestId);
  const result = await pool.query(
    `DELETE FROM ride_posts
      WHERE id = $1 AND wedding_id = $2 AND creator_guest_id = $3`,
    [postId, guest.wedding_id, guestId],
  );
  if (result.rowCount === 0) throw createError('הפרסום לא נמצא', 404);
}