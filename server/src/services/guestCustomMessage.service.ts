import { pool } from '../db/pool';
import { createError } from '../middleware/errorHandler';
import { sendMail } from './email.service';
import { assertDanHavivCouple } from './weddingRequest.service';

export type GuestMessageAudience = 'COMING' | 'PENDING' | 'ALL';
export type GuestMessageDecision = 'approved' | 'rejected';

export interface CreateGuestMessageInput {
  audience: GuestMessageAudience;
  message_body: string;
  scheduled_at: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]!);
}

function audienceLabel(audience: GuestMessageAudience): string {
  if (audience === 'COMING') return 'אישרו הגעה';
  if (audience === 'PENDING') return 'טרם אישרו הגעה';
  return 'כולם';
}

export async function createGuestMessageRequest(
  coupleId: string,
  weddingId: number,
  input: CreateGuestMessageInput,
): Promise<{ request: Record<string, unknown>; admin_notification_sent: boolean }> {
  const { rows: coupleRows } = await pool.query<{ wedding_id: number }>(
    `SELECT wedding_id FROM guests WHERE id = $1 AND role = 'couple' LIMIT 1`,
    [coupleId],
  );
  if (!coupleRows[0] || Number(coupleRows[0].wedding_id) !== weddingId) {
    throw createError('אין הרשאה לחתונה המבוקשת', 403);
  }

  const { rows } = await pool.query(
    `INSERT INTO wedding_custom_message_requests
       (wedding_id, requested_by, audience, message_body, scheduled_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [weddingId, coupleId, input.audience, input.message_body, input.scheduled_at],
  );
  const request = rows[0] as Record<string, unknown>;

  let adminNotificationSent = false;
  const adminEmail = process.env.WEDFLOW_ADMIN_MAIL ?? process.env.EMAIL_ADMIN;
  const scheduledAtLabel = new Date(input.scheduled_at).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
  if (adminEmail) {
    try {
      const { rows: weddingRows } = await pool.query<{ bride_name: string; groom_name: string }>(
        'SELECT bride_name, groom_name FROM wedding_info WHERE id = $1',
        [weddingId],
      );
      const wedding = weddingRows[0];
      await sendMail({
        to: adminEmail,
        subject: `בקשת הודעת WhatsApp לאורחים: ${wedding?.bride_name ?? ''} ו${wedding?.groom_name ?? ''}`,
        text: `התקבלה בקשה חדשה לשליחת הודעת WhatsApp.\nקהל: ${audienceLabel(input.audience)}\nמועד: ${scheduledAtLabel}\n\n${input.message_body}`,
        html: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7"><h2>בקשה חדשה להודעת WhatsApp</h2><p><b>החתונה:</b> ${escapeHtml(`${wedding?.bride_name ?? ''} ו${wedding?.groom_name ?? ''}`)}</p><p><b>קהל:</b> ${audienceLabel(input.audience)}</p><p><b>מועד מתוכנן:</b> ${escapeHtml(scheduledAtLabel)}</p><p><b>תוכן ההודעה:</b></p><div style="white-space:pre-wrap">${escapeHtml(input.message_body)}</div><p>יש לאשר או לדחות דרך טאב בקשות ההרשמה במערכת.</p></div>`,
      });
      adminNotificationSent = true;
    } catch (error) {
      console.error('[Guest custom message] Could not notify admin:', error);
    }
  } else {
    console.error('[Guest custom message] WEDFLOW_ADMIN_MAIL and EMAIL_ADMIN are not configured.');
  }

  return { request, admin_notification_sent: adminNotificationSent };
}

export async function listCoupleGuestMessageRequests(coupleId: string, weddingId: number) {
  const { rows: coupleRows } = await pool.query<{ wedding_id: number }>(
    `SELECT wedding_id FROM guests WHERE id = $1 AND role = 'couple' LIMIT 1`,
    [coupleId],
  );
  if (!coupleRows[0] || Number(coupleRows[0].wedding_id) !== weddingId) {
    throw createError('אין הרשאה לחתונה המבוקשת', 403);
  }

  const { rows } = await pool.query(
    `SELECT r.*,
       COUNT(d.id)::int AS recipient_count,
       COUNT(d.id) FILTER (WHERE d.status = 'sent')::int AS sent_count,
       COUNT(d.id) FILTER (WHERE d.status = 'failed')::int AS failed_count
     FROM wedding_custom_message_requests r
     LEFT JOIN wedding_custom_message_deliveries d ON d.request_id = r.id
     WHERE r.wedding_id = $1
     GROUP BY r.id
     ORDER BY r.created_at DESC`,
    [weddingId],
  );
  return rows;
}

export async function listAdminGuestMessageRequests(coupleId: string) {
  await assertDanHavivCouple(coupleId);
  const { rows } = await pool.query(
    `SELECT r.*, wi.bride_name, wi.groom_name,
       COUNT(d.id)::int AS recipient_count,
       COUNT(d.id) FILTER (WHERE d.status = 'sent')::int AS sent_count,
       COUNT(d.id) FILTER (WHERE d.status = 'failed')::int AS failed_count
     FROM wedding_custom_message_requests r
     JOIN wedding_info wi ON wi.id = r.wedding_id
     LEFT JOIN wedding_custom_message_deliveries d ON d.request_id = r.id
     GROUP BY r.id, wi.id
     ORDER BY CASE r.status WHEN 'pending_approval' THEN 0 ELSE 1 END,
       r.created_at DESC`,
  );
  return rows;
}

export async function reviewGuestMessageRequest(
  coupleId: string,
  requestId: number,
  decision: GuestMessageDecision,
  note?: string,
) {
  await assertDanHavivCouple(coupleId);

  const client = await pool.connect();
  let updatedRequest: Record<string, any> | undefined;
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT r.*, wi.email, wi.bride_name, wi.groom_name
       FROM wedding_custom_message_requests r
       JOIN wedding_info wi ON wi.id = r.wedding_id
       WHERE r.id = $1
       FOR UPDATE OF r`,
      [requestId],
    );
    const existing = rows[0];
    if (!existing) throw createError('בקשת הודעה לא נמצאה', 404);
    if (existing.status !== 'pending_approval') {
      throw createError('הבקשה כבר טופלה', 409);
    }
    if (new Date(existing.scheduled_at).getTime() <= Date.now()) {
      await client.query(
        `UPDATE wedding_custom_message_requests
         SET status = 'expired', updated_at = NOW()
         WHERE id = $1`,
        [requestId],
      );
      await client.query('COMMIT');
      throw createError('מועד הבקשה עבר; יש להגיש בקשה חדשה', 409);
    }

    const { rows: updatedRows } = await client.query(
      `UPDATE wedding_custom_message_requests
       SET status = $2, admin_note = $3, decided_at = NOW(), decided_by = $4, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [requestId, decision, note?.trim() || null, coupleId],
    );
    updatedRequest = { ...updatedRows[0], email: existing.email, bride_name: existing.bride_name, groom_name: existing.groom_name };
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  let coupleNotificationSent = false;
  if (decision === 'approved' && updatedRequest?.email) {
    try {
      await sendMail({
        to: updatedRequest.email,
        subject: 'בקשת הודעת WhatsApp אושרה',
        text: `בקשת ההודעה שלכם אושרה על ידי מנהל המערכת ותישלח במועד שנבחר.\nמועד: ${updatedRequest.scheduled_at}`,
        html: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7"><h2>בקשת ההודעה אושרה</h2><p>בקשת הודעת ה־WhatsApp של ${escapeHtml(`${updatedRequest.bride_name} ו${updatedRequest.groom_name}`)} אושרה ותישלח במועד שנבחר.</p><p><b>מועד:</b> ${escapeHtml(new Date(updatedRequest.scheduled_at).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' }))}</p></div>`,
      });
      coupleNotificationSent = true;
    } catch (error) {
      console.error('[Guest custom message] Could not notify couple about approval:', error);
    }
  }

  return { request: updatedRequest, couple_notification_sent: coupleNotificationSent };
}