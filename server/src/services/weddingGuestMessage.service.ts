import { DateTime } from 'luxon';
import { pool } from '../db/pool';
import { createError } from '../middleware/errorHandler';
import { computeWhenLabel, getDaysUntilWedding, ISRAEL_TIMEZONE, type WeddingMessageTemplateName } from '../utils/scheduling.util';
import { buildTemplateComponents, sendTemplateMessageWithRetry, TEMPLATE_TO_TAB_INDEX, WhatsAppApiError } from './whatsapp.service';
import { claimMessageLog, markLogFailed, markLogSent } from './weddingMessageLog.service';
import { WhatsAppQuotaError } from './whatsappQuota.service';

const supportedTemplates: WeddingMessageTemplateName[] = [
  'wedding_confirmation', 'wedding_reminder', 'wedding_day_before', 'wedding_post_thanks',
];

interface ManualMessageRow {
  wedding_id: number;
  bride_name: string;
  groom_name: string;
  wedding_date: string;
  wedding_time: string | null;
  wedding_canpoy_time: string | null;
  venue_name: string | null;
  venue_address: string | null;
  whatsapp_owner_confirmed: boolean;
  invitation_image_media_id: string | null;
  guest_id: string;
  full_name: string;
  first_name: string | null;
  phone: string;
  rsvp_status: 'PENDING' | 'COMING' | 'NOT_COMING';
}

function shortTime(value: string | null): string {
  return value?.slice(0, 5) ?? '';
}

export async function sendWeddingTemplateForCouple(
  coupleId: string,
  guestId: string,
  templateName: string,
): Promise<void> {
  if (!supportedTemplates.includes(templateName as WeddingMessageTemplateName)) {
    throw createError('סוג הודעת WhatsApp אינו תקין', 400);
  }
  const template = templateName as WeddingMessageTemplateName;
  const { rows } = await pool.query<ManualMessageRow>(
    `SELECT wi.id AS wedding_id, wi.bride_name, wi.groom_name, wi.wedding_date::text AS wedding_date,
       wi.wedding_time::text AS wedding_time, wi.wedding_canpoy_time::text AS wedding_canpoy_time,
       wi.venue_name, wi.venue_address, wi.whatsapp_owner_confirmed, s.invitation_image_media_id,
       g.id AS guest_id, g.full_name, g.first_name, g.phone, g.rsvp_status
     FROM guests couple
     JOIN wedding_info wi ON wi.id = couple.wedding_id
     JOIN guests g ON g.wedding_id = wi.id AND g.role = 'guest'
     LEFT JOIN wedding_message_schedule s ON s.wedding_id = wi.id
     WHERE couple.id = $1 AND couple.role = 'couple' AND g.id::text = $2`,
    [coupleId, guestId],
  );
  const row = rows[0];
  if (!row) throw createError('האורח לא נמצא בחתונה שלכם', 404);
  if (!row.whatsapp_owner_confirmed) throw createError('יש לאשר שימוש ב-WhatsApp לפני השליחה', 400);
  if (!row.phone?.trim()) throw createError('לאורח אין מספר טלפון לשליחה', 400);
  if (String(process.env.WHATSAPP_TEST_ONLY ?? 'false').toLowerCase() === 'true' &&
      (!row.phone.endsWith('9899') || row.first_name?.trim() !== 'דן')) {
    throw createError('מצב בדיקה מאפשר שליחה לאורח הבדיקה בלבד', 403);
  }

  const todayIsrael = DateTime.now().setZone(ISRAEL_TIMEZONE).startOf('day');
  const weddingDay = DateTime.fromISO(row.wedding_date, { zone: ISRAEL_TIMEZONE }).startOf('day');
  if (template === 'wedding_reminder' && row.rsvp_status !== 'PENDING') {
    throw createError('תזכורת נשלחת רק לאורח שעדיין ממתין לאישור הגעה', 400);
  }
  if ((template === 'wedding_day_before' || template === 'wedding_post_thanks') && row.rsvp_status !== 'COMING') {
    throw createError('הודעה זו נשלחת רק לאורח שאישר הגעה', 400);
  }
  if (template === 'wedding_day_before' && todayIsrael > weddingDay) {
    throw createError('לא ניתן לשלוח הודעת יום־לפני אחרי תאריך האירוע', 400);
  }
  if (template === 'wedding_post_thanks' && todayIsrael <= weddingDay) {
    throw createError('ניתן לשלוח הודעת תודה רק לאחר תאריך האירוע', 400);
  }
  if (template === 'wedding_confirmation' && !row.invitation_image_media_id) {
    throw createError('יש להעלות תמונת הזמנה לפני שליחת הזמנה ראשונית', 400);
  }
  if (!row.bride_name || !row.groom_name || !row.wedding_date) {
    throw createError('יש להשלים את פרטי האירוע לפני השליחה', 400);
  }
  if (template !== 'wedding_post_thanks' && (!row.wedding_time || !row.wedding_canpoy_time)) {
    throw createError('יש להשלים את שעת קבלת הפנים והחופה לפני השליחה', 400);
  }
  if (template === 'wedding_day_before' && !row.venue_name) {
    throw createError('יש להשלים את מיקום האירוע לפני שליחת הודעת היום־לפני', 400);
  }

  const firstName = row.first_name?.trim() || row.full_name.trim().split(/\s+/)[0];
  const weddingDisplayName = `${row.bride_name} & ${row.groom_name}`;
  const base = (process.env.GUEST_PORTAL_BASE_URL ?? process.env.CLIENT_BASE_URL ?? 'http://localhost:5173').replace(/\/$/, '');
  const digits = row.phone.replace(/\D/g, '');
  const guestUrl = new URLSearchParams({ n: row.full_name, p: digits.slice(-4), w: String(row.wedding_id) });
  guestUrl.append('t', String(TEMPLATE_TO_TAB_INDEX[template]));
  const components = buildTemplateComponents({
    templateName: template,
    guestFullName: row.full_name,
    guestFirstName: firstName,
    weddingDisplayName,
    weddingDate: row.wedding_date,
    weddingTime: shortTime(row.wedding_time),
    weddingCanpoyTime: shortTime(row.wedding_canpoy_time),
    venueName: row.venue_name ?? '',
    venueAddress: row.venue_address ?? '',
    guestUrl: `${base}/?${guestUrl.toString()}`,
    invitationImageMediaId: row.invitation_image_media_id ?? undefined,
    whenLabel: template === 'wedding_day_before'
      ? computeWhenLabel(getDaysUntilWedding(row.wedding_date, DateTime.now().setZone(ISRAEL_TIMEZONE)))
      : undefined,
  });

  const pending = await claimMessageLog(row.wedding_id, row.guest_id, template, true);
  if (!pending) throw createError('כבר מתבצעת שליחה של הודעה זו לאורח. נסו שוב בעוד רגע.', 409);

  try {
    const result = await sendTemplateMessageWithRetry({
      to: row.phone,
      templateName: template,
      languageCode: 'he',
      components,
    });
    await markLogSent(pending.id, result.messageId);
  } catch (error) {
    if (error instanceof WhatsAppQuotaError ||
        (error instanceof WhatsAppApiError && error.statusCode && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 408)) {
      await markLogFailed(pending.id, error.message);
    }
    if (error instanceof WhatsAppQuotaError) throw error;
    if (error instanceof WhatsAppApiError && error.statusCode && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 408) {
      throw createError('שליחת הודעת WhatsApp נכשלה. ניתן לנסות שוב.', 502);
    }
    throw createError('תוצאת השליחה אינה ידועה. יש לבדוק את יומן ההודעות לפני ניסיון נוסף.', 502);
  }
}