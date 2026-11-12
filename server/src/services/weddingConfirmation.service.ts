import { pool } from '../db/pool';
import { createError } from '../middleware/errorHandler';
import { claimConfirmationLog, markLogFailed, markLogSent } from './weddingMessageLog.service';
import { buildTemplateComponents, sendTemplateMessage, WhatsAppApiError } from './whatsapp.service';

export interface ConfirmationWedding {
  id: number;
  bride_name: string;
  groom_name: string;
  wedding_date: string;
  wedding_time: string;
  wedding_canpoy_time: string;
  venue_name: string;
  venue_address: string;
  whatsapp_owner_confirmed: boolean;
  invitation_image_media_id: string | null;
}

export interface ConfirmationGuest {
  id: string;
  full_name: string;
  first_name: string | null;
  phone: string;
}

export async function sendWeddingConfirmation(wedding: ConfirmationWedding, guest: ConfirmationGuest, allowResend = false): Promise<boolean> {
  if (!wedding.whatsapp_owner_confirmed) throw createError('יש לאשר שימוש ב-WhatsApp לפני השליחה', 400);
  if (!wedding.invitation_image_media_id) throw createError('יש להעלות תמונת הזמנה לפני השליחה', 400);
  if (!wedding.bride_name || !wedding.groom_name || !wedding.wedding_date || !wedding.wedding_time || !wedding.wedding_canpoy_time || !guest.full_name || !guest.phone) {
    throw createError('יש להשלים את פרטי האירוע והאורח לפני השליחה', 400);
  }
  if (!process.env.WHATSAPP_PHONE_NUMBER_ID || !process.env.WHATSAPP_ACCESS_TOKEN) {
    throw createError('הגדרות WhatsApp אינן זמינות', 503);
  }
  if (String(process.env.WHATSAPP_TEST_ONLY ?? 'false').toLowerCase() === 'true' &&
      (!guest.phone.endsWith('9899') || guest.first_name?.trim() !== 'דן')) {
    throw createError('מצב בדיקה מאפשר שליחה לאורח הבדיקה בלבד', 403);
  }

  const base = (process.env.GUEST_PORTAL_BASE_URL ?? process.env.CLIENT_BASE_URL ?? 'http://localhost:5173').replace(/\/$/, '');
  const params = new URLSearchParams({ n: guest.full_name, p: guest.phone.replace(/\D/g, '').slice(-4), w: String(wedding.id), t: '5' });
  const components = buildTemplateComponents({
    templateName: 'wedding_confirmation',
    guestFullName: guest.full_name,
    guestFirstName: guest.first_name?.trim() || guest.full_name.split(/\s+/)[0],
    weddingDisplayName: `${wedding.bride_name} & ${wedding.groom_name}`,
    weddingDate: wedding.wedding_date,
    weddingTime: wedding.wedding_time.slice(0, 5),
    weddingCanpoyTime: wedding.wedding_canpoy_time.slice(0, 5),
    venueName: wedding.venue_name,
    venueAddress: wedding.venue_address,
    guestUrl: `${base}/?${params.toString()}`,
    invitationImageMediaId: wedding.invitation_image_media_id,
  });

  const pending = await claimConfirmationLog(wedding.id, guest.id, allowResend);
  if (!pending) return false;

  let messageId: string;
  try {
    const result = await sendTemplateMessage({ to: guest.phone, templateName: 'wedding_confirmation', languageCode: 'he', components });
    messageId = result.messageId;
  } catch (error) {
    if (error instanceof WhatsAppApiError && error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      await markLogFailed(pending.id, error.message);
      throw createError('שליחת הודעת WhatsApp נכשלה. ניתן לנסות שוב.', 502);
    }
    throw createError('תוצאת השליחה אינה ידועה. יש לבדוק את יומן ההודעות לפני ניסיון נוסף.', 502);
  }
  try {
    await markLogSent(pending.id, messageId);
  } catch {
    throw createError('WhatsApp קיבלה את ההודעה, אך עדכון היומן נכשל. יש לבדוק את היומן לפני ניסיון נוסף.', 502);
  }
  return true;
}

export async function sendConfirmationForCouple(coupleId: string, guestId: string): Promise<void> {
  const { rows } = await pool.query<ConfirmationWedding & Omit<ConfirmationGuest, 'id'> & { guest_id: string }>(
    `SELECT wi.id, wi.bride_name, wi.groom_name, wi.wedding_date, wi.wedding_time,
            wi.wedding_canpoy_time, wi.venue_name, wi.venue_address, wi.whatsapp_owner_confirmed,
            s.invitation_image_media_id, g.id AS guest_id, g.full_name, g.first_name, g.phone
     FROM guests couple
     JOIN wedding_info wi ON wi.id = couple.wedding_id
     JOIN guests g ON g.wedding_id = wi.id AND g.role = 'guest'
     LEFT JOIN wedding_message_schedule s ON s.wedding_id = wi.id
     WHERE couple.id = $1 AND couple.role = 'couple' AND g.id::text = $2`,
    [coupleId, guestId],
  );
  const row = rows[0];
  if (!row) throw createError('האורח לא נמצא בחתונה שלכם', 404);
  await sendWeddingConfirmation(row, { id: row.guest_id, full_name: row.full_name, first_name: row.first_name, phone: row.phone }, true);
}