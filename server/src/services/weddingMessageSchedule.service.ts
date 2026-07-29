import { pool } from '../db/pool';
import { createError } from '../middleware/errorHandler';
import { computeWeddingMessageScheduleDates } from '../utils/scheduling.util';
import { uploadMediaToWhatsApp } from './whatsapp.service';

export interface WeddingMessageScheduleRow {
  id: number;
  wedding_id: number;
  invitation_days_before: number;
  reminder_days_before: number;
  day_before_offset_days: number;
  invitation_locked_at: string | null;
  reminder_locked_at: string | null;
  day_before_locked_at: string | null;
  invitation_image_mime_type: string | null;
  invitation_image_filename: string | null;
  invitation_image_media_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WeddingMessageScheduleResponse extends WeddingMessageScheduleRow {
  invitation_send_at: string;
  reminder_send_at: string;
  day_before_send_at: string;
  has_invitation_image: boolean;
}

export interface SchedulePatchInput {
  invitation_days_before?: number;
  reminder_days_before?: number;
  day_before_offset_days?: number;
}

interface WeddingDateRow {
  wedding_date: string;
}

interface InvitationImageRow {
  invitation_image: Buffer | null;
  invitation_image_mime_type: string | null;
  invitation_image_filename: string | null;
  invitation_image_media_id: string | null;
}

async function getWeddingDate(weddingId: number): Promise<string> {
  const { rows } = await pool.query<WeddingDateRow>(
    'SELECT wedding_date FROM wedding_info WHERE id = $1 LIMIT 1',
    [weddingId],
  );

  if (!rows[0]) {
    throw createError('חתונה לא נמצאה', 404);
  }

  return rows[0].wedding_date;
}

async function ensureScheduleRow(weddingId: number): Promise<WeddingMessageScheduleRow> {
  await getWeddingDate(weddingId);

  await pool.query(
    'INSERT INTO wedding_message_schedule (wedding_id) VALUES ($1) ON CONFLICT (wedding_id) DO NOTHING',
    [weddingId],
  );

  const { rows } = await pool.query<WeddingMessageScheduleRow>(
    `SELECT
      id,
      wedding_id,
      invitation_days_before,
      reminder_days_before,
      day_before_offset_days,
      invitation_locked_at,
      reminder_locked_at,
      day_before_locked_at,
      invitation_image_mime_type,
      invitation_image_filename,
      invitation_image_media_id,
      created_at,
      updated_at
    FROM wedding_message_schedule
    WHERE wedding_id = $1
    LIMIT 1`,
    [weddingId],
  );

  if (!rows[0]) {
    throw createError('הגדרות שליחת WhatsApp לא נמצאו', 404);
  }

  return rows[0];
}

function toResponse(row: WeddingMessageScheduleRow, weddingDate: string): WeddingMessageScheduleResponse {
  const computed = computeWeddingMessageScheduleDates(weddingDate, {
    invitationDaysBefore: row.invitation_days_before,
    reminderDaysBefore: row.reminder_days_before,
    dayBeforeOffsetDays: row.day_before_offset_days,
  });

  return {
    ...row,
    invitation_send_at: computed.invitationSendAt,
    reminder_send_at: computed.reminderSendAt,
    day_before_send_at: computed.dayBeforeSendAt,
    has_invitation_image: Boolean(row.invitation_image_mime_type),
  };
}

function assertDaysValue(value: number, fieldLabel: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw createError(`${fieldLabel} חייב להיות מספר שלם גדול או שווה ל-0`, 400);
  }
}

export async function getWeddingMessageSchedule(weddingId: number): Promise<WeddingMessageScheduleResponse> {
  const [row, weddingDate] = await Promise.all([
    ensureScheduleRow(weddingId),
    getWeddingDate(weddingId),
  ]);

  return toResponse(row, weddingDate);
}

export async function updateWeddingMessageSchedule(
  weddingId: number,
  patch: SchedulePatchInput,
): Promise<WeddingMessageScheduleResponse> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      'INSERT INTO wedding_message_schedule (wedding_id) VALUES ($1) ON CONFLICT (wedding_id) DO NOTHING',
      [weddingId],
    );

    const weddingDateResult = await client.query<WeddingDateRow>(
      'SELECT wedding_date FROM wedding_info WHERE id = $1 LIMIT 1',
      [weddingId],
    );

    if (!weddingDateResult.rows[0]) {
      throw createError('חתונה לא נמצאה', 404);
    }

    const currentResult = await client.query<WeddingMessageScheduleRow>(
      `SELECT
        id,
        wedding_id,
        invitation_days_before,
        reminder_days_before,
        day_before_offset_days,
        invitation_locked_at,
        reminder_locked_at,
        day_before_locked_at,
        invitation_image_mime_type,
        invitation_image_filename,
        invitation_image_media_id,
        created_at,
        updated_at
      FROM wedding_message_schedule
      WHERE wedding_id = $1
      FOR UPDATE`,
      [weddingId],
    );

    const current = currentResult.rows[0];
    if (!current) {
      throw createError('הגדרות שליחת WhatsApp לא נמצאו', 404);
    }

    const sets: string[] = [];
    const values: Array<number | string> = [];
    let idx = 1;

    if (patch.invitation_days_before !== undefined) {
      if (current.invitation_locked_at) {
        throw createError('ההזמנה הראשונית כבר נשלחה ולא ניתנת לעריכה', 400);
      }
      assertDaysValue(patch.invitation_days_before, 'ימי שליחה להזמנה ראשונית');
      sets.push(`invitation_days_before = $${idx++}`);
      values.push(patch.invitation_days_before);
    }

    if (patch.reminder_days_before !== undefined) {
      if (current.reminder_locked_at) {
        throw createError('תזכורת לטרם אישרו כבר נשלחה ולא ניתנת לעריכה', 400);
      }
      assertDaysValue(patch.reminder_days_before, 'ימי שליחה לתזכורת');
      sets.push(`reminder_days_before = $${idx++}`);
      values.push(patch.reminder_days_before);
    }

    if (patch.day_before_offset_days !== undefined) {
      if (current.day_before_locked_at) {
        throw createError('תזכורת יום לפני כבר נשלחה ולא ניתנת לעריכה', 400);
      }
      assertDaysValue(patch.day_before_offset_days, 'ימי שליחה לתזכורת יום לפני');
      sets.push(`day_before_offset_days = $${idx++}`);
      values.push(patch.day_before_offset_days);
    }

    if (sets.length > 0) {
      sets.push('updated_at = NOW()');
      values.push(weddingId);

      await client.query(
        `UPDATE wedding_message_schedule SET ${sets.join(', ')} WHERE wedding_id = $${idx}`,
        values,
      );
    }

    const finalResult = await client.query<WeddingMessageScheduleRow>(
      `SELECT
        id,
        wedding_id,
        invitation_days_before,
        reminder_days_before,
        day_before_offset_days,
        invitation_locked_at,
        reminder_locked_at,
        day_before_locked_at,
        invitation_image_mime_type,
        invitation_image_filename,
        invitation_image_media_id,
        created_at,
        updated_at
      FROM wedding_message_schedule
      WHERE wedding_id = $1
      LIMIT 1`,
      [weddingId],
    );

    await client.query('COMMIT');

    return toResponse(finalResult.rows[0], weddingDateResult.rows[0].wedding_date);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function saveInvitationImage(
  weddingId: number,
  file: Express.Multer.File,
): Promise<WeddingMessageScheduleResponse> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    await client.query(
      'INSERT INTO wedding_message_schedule (wedding_id) VALUES ($1) ON CONFLICT (wedding_id) DO NOTHING',
      [weddingId],
    );

    const scheduleResult = await client.query<WeddingMessageScheduleRow>(
      `SELECT
        id,
        wedding_id,
        invitation_days_before,
        reminder_days_before,
        day_before_offset_days,
        invitation_locked_at,
        reminder_locked_at,
        day_before_locked_at,
        invitation_image_mime_type,
        invitation_image_filename,
        invitation_image_media_id,
        created_at,
        updated_at
      FROM wedding_message_schedule
      WHERE wedding_id = $1
      FOR UPDATE`,
      [weddingId],
    );

    const schedule = scheduleResult.rows[0];
    if (!schedule) {
      throw createError('הגדרות שליחת WhatsApp לא נמצאו', 404);
    }

    if (schedule.invitation_locked_at) {
      throw createError('ההזמנה הראשונית כבר נשלחה ולא ניתנת לעריכה', 400);
    }

    const weddingDateResult = await client.query<WeddingDateRow>(
      'SELECT wedding_date FROM wedding_info WHERE id = $1 LIMIT 1',
      [weddingId],
    );

    if (!weddingDateResult.rows[0]) {
      throw createError('חתונה לא נמצאה', 404);
    }

    const mediaId = await uploadMediaToWhatsApp({
      data: file.buffer,
      mimeType: file.mimetype,
      filename: file.originalname,
    });
    console.log(`Invitation image uploaded to WhatsApp with media ID: ${mediaId}`);
    await client.query(
      `UPDATE wedding_message_schedule
        SET invitation_image = $1,
          invitation_image_mime_type = $2,
          invitation_image_filename = $3,
          invitation_image_media_id = $4,
          updated_at = NOW()
        WHERE wedding_id = $5`,
      [
        file.buffer,
        file.mimetype,
        file.originalname,
        mediaId,
        weddingId,
      ],
    );

    const finalResult = await client.query<WeddingMessageScheduleRow>(
      `SELECT
        id,
        wedding_id,
        invitation_days_before,
        reminder_days_before,
        day_before_offset_days,
        invitation_locked_at,
        reminder_locked_at,
        day_before_locked_at,
        invitation_image_mime_type,
        invitation_image_filename,
        invitation_image_media_id,
        created_at,
        updated_at
      FROM wedding_message_schedule
      WHERE wedding_id = $1
      LIMIT 1`,
      [weddingId],
    );

    await client.query('COMMIT');

    return toResponse(finalResult.rows[0], weddingDateResult.rows[0].wedding_date);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function clearInvitationImage(weddingId: number): Promise<WeddingMessageScheduleResponse> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const weddingDateResult = await client.query<WeddingDateRow>(
      'SELECT wedding_date FROM wedding_info WHERE id = $1 LIMIT 1',
      [weddingId],
    );

    if (!weddingDateResult.rows[0]) {
      throw createError('חתונה לא נמצאה', 404);
    }

    await client.query(
      'INSERT INTO wedding_message_schedule (wedding_id) VALUES ($1) ON CONFLICT (wedding_id) DO NOTHING',
      [weddingId],
    );

    const currentResult = await client.query<WeddingMessageScheduleRow>(
      `SELECT
        id,
        wedding_id,
        invitation_days_before,
        reminder_days_before,
        day_before_offset_days,
        invitation_locked_at,
        reminder_locked_at,
        day_before_locked_at,
        invitation_image_mime_type,
        invitation_image_filename,
        invitation_image_media_id,
        created_at,
        updated_at
      FROM wedding_message_schedule
      WHERE wedding_id = $1
      FOR UPDATE`,
      [weddingId],
    );

    const current = currentResult.rows[0];
    if (!current) {
      throw createError('הגדרות שליחת WhatsApp לא נמצאו', 404);
    }

    if (current.invitation_locked_at) {
      throw createError('ההזמנה הראשונית כבר נשלחה ולא ניתנת לעריכה', 400);
    }

    await client.query(
      `UPDATE wedding_message_schedule
       SET invitation_image = NULL,
           invitation_image_mime_type = NULL,
           invitation_image_filename = NULL,
           invitation_image_media_id = NULL,
           updated_at = NOW()
       WHERE wedding_id = $1`,
      [weddingId],
    );

    const finalResult = await client.query<WeddingMessageScheduleRow>(
      `SELECT
        id,
        wedding_id,
        invitation_days_before,
        reminder_days_before,
        day_before_offset_days,
        invitation_locked_at,
        reminder_locked_at,
        day_before_locked_at,
        invitation_image_mime_type,
        invitation_image_filename,
        invitation_image_media_id,
        created_at,
        updated_at
      FROM wedding_message_schedule
      WHERE wedding_id = $1
      LIMIT 1`,
      [weddingId],
    );

    await client.query('COMMIT');

    return toResponse(finalResult.rows[0], weddingDateResult.rows[0].wedding_date);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getInvitationImage(
  weddingId: number,
): Promise<InvitationImageRow> {
  const schedule = await ensureScheduleRow(weddingId);

  const { rows } = await pool.query<InvitationImageRow>(
    `SELECT invitation_image, invitation_image_mime_type, invitation_image_filename, invitation_image_media_id
     FROM wedding_message_schedule
     WHERE wedding_id = $1
     LIMIT 1`,
    [schedule.wedding_id],
  );

  if (!rows[0] || !rows[0].invitation_image || !rows[0].invitation_image_mime_type) {
    throw createError('לא הועלתה תמונת הזמנה לחתונה זו', 404);
  }

  return rows[0];
}
