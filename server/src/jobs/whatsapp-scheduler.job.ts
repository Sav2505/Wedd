import cron from 'node-cron';
import { DateTime } from 'luxon';
import { pool } from '../db/pool';
import {
  buildTemplateComponents,
  sendTemplateMessageWithRetry,
  uploadMediaToWhatsApp,
} from '../services/whatsapp.service';
import {
  markLogFailed,
  markLogSent,
  MessageTemplateName,
  upsertPendingLog,
} from '../services/weddingMessageLog.service';
import { computeWeddingMessageScheduleDates, ISRAEL_TIMEZONE } from '../utils/scheduling.util';

interface WeddingInfoRow {
  id: number;
  bride_name: string;
  groom_name: string;
  wedding_date: string;
  wedding_time: string;
  wedding_canpoy_time: string;
  venue_name: string;
  venue_address: string;
}

interface ScheduleRow {
  wedding_id: number;
  invitation_days_before: number;
  reminder_days_before: number;
  day_before_offset_days: number;
  invitation_locked_at: string | null;
  reminder_locked_at: string | null;
  day_before_locked_at: string | null;
  invitation_image: Buffer | null;
  invitation_image_mime_type: string | null;
  invitation_image_filename: string | null;
}

interface GuestRow {
  id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  phone: string;
  rsvp_status: 'PENDING' | 'COMING' | 'NOT_COMING';
}

const DEFAULT_CRON = process.env.WHATSAPP_SCHEDULER_CRON ?? '0 6 * * *';
const ENABLED = String(process.env.WHATSAPP_SCHEDULER_ENABLED ?? 'true').toLowerCase() === 'true';
const RATE_PER_MINUTE = Math.max(1, Number(process.env.WHATSAPP_SEND_RATE_PER_MINUTE ?? 80));
const BATCH_SIZE = Math.max(1, Number(process.env.WHATSAPP_BATCH_SIZE ?? 20));
const INTERVAL_MS = Math.ceil(60_000 / RATE_PER_MINUTE);

const ADVISORY_LOCK_KEY = 748921;

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function buildGuestUrl(weddingId: number, fullName: string, phone: string): string {
  const base = (process.env.GUEST_PORTAL_BASE_URL ?? process.env.CLIENT_BASE_URL ?? 'http://localhost:5173').replace(/\/$/, '');
  const digits = phone.replace(/\D/g, '');
  const params = new URLSearchParams({
    n: fullName,
    p: digits.slice(-4),
    w: String(weddingId),
  });
  return `${base}/?${params.toString()}`;
}

async function getWeddingScheduleRows(): Promise<Array<WeddingInfoRow & ScheduleRow>> {
  await pool.query(
    'INSERT INTO wedding_message_schedule (wedding_id) VALUES (1) ON CONFLICT (wedding_id) DO NOTHING',
  );

  const { rows } = await pool.query<Array<WeddingInfoRow & ScheduleRow>[number]>(
    `SELECT
      wi.id,
      wi.bride_name,
      wi.groom_name,
      wi.wedding_date,
      wi.wedding_time,
      wi.wedding_canpoy_time,
      wi.venue_name,
      wi.venue_address,
      s.wedding_id,
      s.invitation_days_before,
      s.reminder_days_before,
      s.day_before_offset_days,
      s.invitation_locked_at,
      s.reminder_locked_at,
      s.day_before_locked_at,
      s.invitation_image,
      s.invitation_image_mime_type,
      s.invitation_image_filename
     FROM wedding_info wi
     JOIN wedding_message_schedule s ON s.wedding_id = wi.id`,
  );

  return rows;
}

async function getEligibleGuests(weddingId: number, templateName: MessageTemplateName): Promise<GuestRow[]> {
  const reminderFilter =
    templateName === 'wedding_reminder'
      ? "AND g.rsvp_status <> 'COMING'"
      : '';

  const { rows } = await pool.query<GuestRow>(
    `SELECT
      g.id,
      g.full_name,
      g.first_name,
      g.last_name,
      g.phone,
      g.rsvp_status
     FROM guests g
     LEFT JOIN wedding_message_log l
       ON l.wedding_id = g.wedding_id
      AND l.guest_id = g.id
      AND l.template_name = $2
     WHERE g.wedding_id = $1
       AND g.role = 'guest'
       ${reminderFilter}
       AND (
         l.id IS NULL
         OR l.status NOT IN ('sent', 'delivered', 'read')
       )
     ORDER BY g.created_at ASC`,
    [weddingId, templateName],
  );

  return rows;
}

async function maybeLockTemplate(weddingId: number, templateName: MessageTemplateName): Promise<void> {
  const column =
    templateName === 'wedding_confirmation'
      ? 'invitation_locked_at'
      : templateName === 'wedding_reminder'
        ? 'reminder_locked_at'
        : 'day_before_locked_at';

  await pool.query(
    `UPDATE wedding_message_schedule
     SET ${column} = COALESCE(${column}, NOW()),
         updated_at = NOW()
     WHERE wedding_id = $1`,
    [weddingId],
  );
}

function shouldRunForToday(sendAtIso: string, todayIsrael: DateTime): boolean {
  const sendDate = DateTime.fromISO(sendAtIso, { zone: ISRAEL_TIMEZONE }).toISODate();
  const today = todayIsrael.toISODate();
  return Boolean(sendDate && today && sendDate <= today);
}

async function processTemplateForWedding(
  wedding: WeddingInfoRow & ScheduleRow,
  templateName: MessageTemplateName,
  todayIsrael: DateTime,
): Promise<void> {
  const computed = computeWeddingMessageScheduleDates(wedding.wedding_date, {
    invitationDaysBefore: wedding.invitation_days_before,
    reminderDaysBefore: wedding.reminder_days_before,
    dayBeforeOffsetDays: wedding.day_before_offset_days,
  });

  const lockMap: Record<MessageTemplateName, string | null> = {
    wedding_confirmation: wedding.invitation_locked_at,
    wedding_reminder: wedding.reminder_locked_at,
    wedding_day_before: wedding.day_before_locked_at,
  };

  const dateMap: Record<MessageTemplateName, string> = {
    wedding_confirmation: computed.invitationSendAt,
    wedding_reminder: computed.reminderSendAt,
    wedding_day_before: computed.dayBeforeSendAt,
  };

  if (lockMap[templateName]) {
    return;
  }

  if (!shouldRunForToday(dateMap[templateName], todayIsrael)) {
    return;
  }

  const guests = await getEligibleGuests(wedding.id, templateName);

  let invitationMediaId: string | undefined;
  if (
    templateName === 'wedding_confirmation' &&
    wedding.invitation_image &&
    wedding.invitation_image_mime_type
  ) {
    invitationMediaId = await uploadMediaToWhatsApp({
      data: wedding.invitation_image,
      mimeType: wedding.invitation_image_mime_type,
      filename: wedding.invitation_image_filename ?? 'invitation-image',
    });

    console.log('[WhatsApp Scheduler] Using invitation IMAGE header for template. Ensure Meta template header type is IMAGE.');
  }

  for (let i = 0; i < guests.length; i += BATCH_SIZE) {
    const batch = guests.slice(i, i + BATCH_SIZE);

    for (const guest of batch) {
      const pending = await upsertPendingLog(wedding.id, guest.id, templateName);
      try {
        const guestFirstName = (guest.first_name?.trim() || guest.full_name.split(/\s+/)[0] || '').trim();
        const weddingDisplayName = `${wedding.groom_name} ו-${wedding.bride_name}`;
        const guestUrl = buildGuestUrl(wedding.id, guest.full_name, guest.phone);

        const components = buildTemplateComponents({
          templateName,
          guestFullName: guest.full_name,
          guestFirstName,
          weddingDisplayName,
          weddingDate: wedding.wedding_date,
          weddingTime: wedding.wedding_time,
          weddingCanpoyTime: wedding.wedding_canpoy_time,
          venueName: wedding.venue_name,
          venueAddress: wedding.venue_address,
          guestUrl,
          invitationImageMediaId: invitationMediaId,
        });

        const sendResult = await sendTemplateMessageWithRetry({
          to: guest.phone,
          templateName,
          languageCode: 'he',
          components,
        }, 3);

        // Add internal API retry attempts to the aggregate counter.
        if (sendResult.attempts > 1) {
          await pool.query(
            `UPDATE wedding_message_log
             SET attempt_count = GREATEST(attempt_count, $1),
                 updated_at = NOW()
             WHERE id = $2`,
            [pending.attempt_count + (sendResult.attempts - 1), pending.id],
          );
        }

        await markLogSent(pending.id, sendResult.messageId);
      } catch (err: any) {
        const message = err?.message ?? 'WhatsApp send failed';
        await markLogFailed(pending.id, message);
      }

      await sleep(INTERVAL_MS);
    }
  }

  await maybeLockTemplate(wedding.id, templateName);
}

export async function runWhatsappSchedulerOnce(): Promise<void> {
  const lockResult = await pool.query<{ pg_try_advisory_lock: boolean }>(
    'SELECT pg_try_advisory_lock($1)',
    [ADVISORY_LOCK_KEY],
  );

  if (!lockResult.rows[0]?.pg_try_advisory_lock) {
    console.log('[WhatsApp Scheduler] skipped: another run holds advisory lock.');
    return;
  }

  try {
    const weddings = await getWeddingScheduleRows();
    const nowIsrael = DateTime.now().setZone(ISRAEL_TIMEZONE);

    for (const wedding of weddings) {
      await processTemplateForWedding(wedding, 'wedding_confirmation', nowIsrael);
      await processTemplateForWedding(wedding, 'wedding_reminder', nowIsrael);
      await processTemplateForWedding(wedding, 'wedding_day_before', nowIsrael);
    }
  } finally {
    await pool.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]);
  }
}

export function initWhatsappScheduler(): void {
  if (!ENABLED) {
    console.log('[WhatsApp Scheduler] disabled by env flag.');
    return;
  }

  cron.schedule(
    DEFAULT_CRON,
    () => {
      runWhatsappSchedulerOnce().catch((err) => {
        console.error('[WhatsApp Scheduler] run failed:', err?.message ?? err);
      });
    },
    { timezone: ISRAEL_TIMEZONE },
  );

  console.log(`[WhatsApp Scheduler] initialized with cron "${DEFAULT_CRON}" (${ISRAEL_TIMEZONE}).`);
}
