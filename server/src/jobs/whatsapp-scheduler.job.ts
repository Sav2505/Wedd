import cron from 'node-cron';
import { DateTime } from 'luxon';
import type { PoolClient } from 'pg';
import { pool } from '../db/pool';
import {
  buildTemplateComponents,
  sendTemplateMessageWithRetry,
  WhatsAppApiError,
  TEMPLATE_TO_TAB_INDEX,
  type SupportedWeddingTemplate,
} from '../services/whatsapp.service';
import { completeWhatsAppQuotaReservation, reserveWhatsAppQuotaBatchInTransaction, WhatsAppQuotaError } from '../services/whatsappQuota.service';
import {
  markLogFailed,
  markLogSent,
  MessageTemplateName,
  upsertPendingLog,
} from '../services/weddingMessageLog.service';
import { computeWeddingMessageScheduleDates, computeWhenLabel, ISRAEL_TIMEZONE } from '../utils/scheduling.util';
import { sendWeddingConfirmation } from '../services/weddingConfirmation.service';

interface WeddingInfoRow {
  id: number;
  bride_name: string;
  groom_name: string;
  wedding_date: string;
  wedding_time: string;
  wedding_canpoy_time: string;
  venue_name: string;
  venue_address: string;
  whatsapp_owner_confirmed: boolean;
}
interface ScheduleRow {
  wedding_id: number;
  invitation_days_before: number;
  reminder_days_before: number;
  day_before_offset_days: number;
  invitation_locked_at: string | null;
  reminder_locked_at: string | null;
  day_before_locked_at: string | null;
  post_thanks_locked_at: string | null;
  invitation_image: Buffer | null;
  invitation_image_mime_type: string | null;
  invitation_image_filename: string | null;
  invitation_image_media_id: string | null;
}
interface GuestRow {
  id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  phone: string;
  rsvp_status: 'PENDING' | 'COMING' | 'NOT_COMING';
}

const DEFAULT_CRON =
  process.env.WHATSAPP_SCHEDULER_CRON ?? '0 12 * * *';
const ENABLED = String(process.env.WHATSAPP_SCHEDULER_ENABLED ?? 'true').toLowerCase() === 'true';
const RATE_PER_MINUTE = Math.max(1, Number(process.env.WHATSAPP_SEND_RATE_PER_MINUTE ?? 80));
const BATCH_SIZE = Math.max(1, Number(process.env.WHATSAPP_BATCH_SIZE ?? 20));
const INTERVAL_MS = Math.ceil(60_000 / RATE_PER_MINUTE);
const ADVISORY_LOCK_KEY = 748921;

const IS_PROD = String(process.env.IS_PROD ?? 'false').toLowerCase() === 'true';
const TEST_ONLY_MODE = String(process.env.WHATSAPP_TEST_ONLY ?? 'false').toLowerCase() === 'true';

const TEST_PHONE_SUFFIX = '9899';
const TEST_FIRST_NAME = 'דן';

const TEST_NOW_OVERRIDE: string | null =
  process.env.WHATSAPP_TEST_NOW ?? null;

function getNowIsrael(): DateTime {
  if (TEST_NOW_OVERRIDE) {
    const fixed = DateTime.fromISO(TEST_NOW_OVERRIDE, { zone: ISRAEL_TIMEZONE });
    return fixed;
  }
  return DateTime.now().setZone(ISRAEL_TIMEZONE);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function buildGuestUrl(weddingId: number, fullName: string, phone: string, tabIndex?: number): string {
  const base = (process.env.GUEST_PORTAL_BASE_URL ?? process.env.CLIENT_BASE_URL ?? 'http://localhost:5173').replace(/\/$/, '');
  const digits = phone.replace(/\D/g, '');
  const params = new URLSearchParams({
    n: fullName,
    p: digits.slice(-4),
    w: String(weddingId),
  });
  if (tabIndex !== undefined) {
    params.append('t', String(tabIndex));
  }
  return `${base}/?${params.toString()}`;
}

// יוצר שורת schedule לכל חתונה שעדיין אין לה אחת - עובד על כל החתונות, לא רק wedding_id=1
async function ensureScheduleRowsExist(): Promise<void> {
  await pool.query(
    `INSERT INTO wedding_message_schedule (wedding_id)
     SELECT id FROM wedding_info
     ON CONFLICT (wedding_id) DO NOTHING
     RETURNING wedding_id`,
  );
}

async function getWeddingScheduleRows(): Promise<Array<WeddingInfoRow & ScheduleRow>> {
  await ensureScheduleRowsExist();

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
      wi.whatsapp_owner_confirmed,
      s.wedding_id,
      s.invitation_days_before,
      s.reminder_days_before,
      s.day_before_offset_days,
      s.invitation_locked_at,
      s.reminder_locked_at,
      s.day_before_locked_at,
      s.post_thanks_locked_at,
      s.invitation_image,
      s.invitation_image_mime_type,
      s.invitation_image_filename,
      s.invitation_image_media_id
     FROM wedding_info wi
     JOIN wedding_message_schedule s ON s.wedding_id = wi.id`,
  );

  return rows;
}

// שולף אורחים ל-wedding_id ספציפי בלבד; בסביבת בדיקות מגביל לאיש הבדיקה
async function getEligibleGuests(
  weddingId: number,
  templateName: MessageTemplateName,
  isProd: boolean,
  groupId?: string | null,
  executor: Pick<PoolClient, 'query'> = pool,
): Promise<GuestRow[]> {
  const templateFilter =
    templateName === 'wedding_reminder'
      ? "AND g.rsvp_status = 'PENDING'"
      : templateName === 'wedding_day_before' || templateName === 'wedding_post_thanks'
        ? "AND g.rsvp_status = 'COMING'"
      : '';

  // במצב test-only מפנים רק לנמען בדיקה אחד; אחרת שולחים לכל האורחים הזכאים.
  const testFilter = TEST_ONLY_MODE
    ? `AND g.phone LIKE '%${TEST_PHONE_SUFFIX}' AND TRIM(COALESCE(g.first_name, '')) = '${TEST_FIRST_NAME}'`
    : '';
  const testLimit = TEST_ONLY_MODE ? 'LIMIT 1' : '';

  const query = `SELECT
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
      AND NULLIF(BTRIM(g.phone), '') IS NOT NULL
      ${groupId === undefined ? '' : 'AND g.guest_group_id IS NOT DISTINCT FROM $3::uuid'}
       ${templateFilter}
       ${testFilter}
       AND (
         l.id IS NULL
         OR l.status = 'failed'
       )
       ${groupId === undefined ? '' : `AND NOT EXISTS (
         SELECT 1 FROM wedding_whatsapp_group_deliveries d
         WHERE d.wedding_id = g.wedding_id AND d.guest_id = g.id AND d.template_name = $2
       )`}
     ORDER BY g.created_at ASC
     ${testLimit}`;

  const { rows } = await executor.query<GuestRow>(query, groupId === undefined ? [weddingId, templateName] : [weddingId, templateName, groupId]);

  return rows;
}

async function maybeLockTemplate(weddingId: number, templateName: MessageTemplateName): Promise<void> {
  const column =
    templateName === 'wedding_confirmation'
      ? 'invitation_locked_at'
      : templateName === 'wedding_reminder'
        ? 'reminder_locked_at'
        : templateName === 'wedding_day_before'
          ? 'day_before_locked_at'
          : 'post_thanks_locked_at';
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
  const result = Boolean(sendDate && today && sendDate <= today);

  return result;
}

// עוזר להסרת השניות משעות (HH:MM:SS -> HH:MM)
function formatTimeShort(time: string | null | undefined): string {
  if (!time) return '';
  return time.slice(0, 5);
}

async function processTemplateForWedding(
  wedding: WeddingInfoRow & ScheduleRow,
  templateName: MessageTemplateName,
  todayIsrael: DateTime,
  isProd: boolean,
): Promise<void> {

  const grouped = await pool.query(
    'SELECT 1 FROM wedding_whatsapp_group_schedule WHERE wedding_id = $1 AND template_name = $2 LIMIT 1',
    [wedding.id, templateName],
  );
  if (grouped.rows.length > 0) return;

  const paused = await pool.query(
    'SELECT 1 FROM wedding_whatsapp_legacy_pauses WHERE wedding_id = $1 AND template_name = $2',
    [wedding.id, templateName],
  );
  if (paused.rows.length > 0) return;

  const computed = computeWeddingMessageScheduleDates(wedding.wedding_date, {
    invitationDaysBefore: wedding.invitation_days_before,
    reminderDaysBefore: wedding.reminder_days_before,
    dayBeforeOffsetDays: wedding.day_before_offset_days,
  });

  const lockMap: Record<MessageTemplateName, string | null> = {
    wedding_confirmation: wedding.invitation_locked_at,
    wedding_reminder: wedding.reminder_locked_at,
    wedding_day_before: wedding.day_before_locked_at,
    wedding_post_thanks: wedding.post_thanks_locked_at,
  };
  const dateMap: Record<MessageTemplateName, string> = {
    wedding_confirmation: computed.invitationSendAt,
    wedding_reminder: computed.reminderSendAt,
    wedding_day_before: computed.dayBeforeSendAt,
    wedding_post_thanks: computed.postThanksSendAt,
  };

  if (lockMap[templateName]) {
    return;
  }
  if (!shouldRunForToday(dateMap[templateName], todayIsrael)) {
    return;
  }

  if (templateName === 'wedding_confirmation' &&
      (!wedding.invitation_image_media_id || !wedding.bride_name || !wedding.groom_name ||
       !wedding.wedding_date || !wedding.wedding_time || !wedding.wedding_canpoy_time ||
       !process.env.WHATSAPP_PHONE_NUMBER_ID || !process.env.WHATSAPP_ACCESS_TOKEN)) {
    console.error(`[WhatsApp Scheduler] Missing confirmation prerequisites for wedding_id=${wedding.id}`);
    return;
  }

  if (templateName === 'wedding_day_before') {
    const weddingDay = DateTime.fromISO(wedding.wedding_date, { zone: ISRAEL_TIMEZONE }).startOf('day');
    const today = todayIsrael.startOf('day');

    // Never send "day before" once the wedding date has already passed.
    if (today > weddingDay) {
      if (isProd) {
        await maybeLockTemplate(wedding.id, templateName);
      }
      return;
    }
  }

  const guests = await getEligibleGuests(wedding.id, templateName, isProd);
  const invitationMediaId =
    templateName === 'wedding_confirmation'
      ? wedding.invitation_image_media_id ?? undefined
      : undefined;

  if (guests.length === 0) {
    console.log(`[WhatsApp Scheduler] 🧪 No eligible guests for wedding_id=${wedding.id}, template=${templateName} - nothing to send.`);
    return;
  }

  for (let i = 0; i < guests.length; i += BATCH_SIZE) {
    const batch = guests.slice(i, i + BATCH_SIZE);
    for (const guest of batch) {

      if (templateName === 'wedding_confirmation') {
        try {
          await sendWeddingConfirmation(wedding, guest);
        } catch (err: any) {
          if (err instanceof WhatsAppQuotaError) {
            await pool.query(
              `INSERT INTO wedding_whatsapp_legacy_pauses (wedding_id, template_name, reason)
               VALUES ($1, $2, $3) ON CONFLICT (wedding_id, template_name) DO NOTHING`,
              [wedding.id, templateName, err.message],
            );
            return;
          }
          console.error(`[WhatsApp Scheduler] Confirmation failed for guest ${guest.id}:`, err?.message);
        }
        await sleep(INTERVAL_MS);
        continue;
      }

      const pending = await upsertPendingLog(wedding.id, guest.id, templateName);
      try {
        const guestFirstName = (guest.first_name?.trim() || guest.full_name.split(/\s+/)[0] || '').trim();
        const weddingDisplayName = `${wedding.bride_name} & ${wedding.groom_name}`;
        const tabIndex = TEMPLATE_TO_TAB_INDEX[templateName as SupportedWeddingTemplate];
        const guestUrl = buildGuestUrl(wedding.id, guest.full_name, guest.phone, tabIndex);

        const daysUntilWedding = Math.round(
          DateTime.fromISO(wedding.wedding_date, { zone: ISRAEL_TIMEZONE }).startOf('day')
            .diff(todayIsrael.startOf('day'), 'days').days
        );

        const components = buildTemplateComponents({
          templateName,
          guestFullName: guest.full_name,
          guestFirstName,
          weddingDisplayName,
          weddingDate: wedding.wedding_date,
          weddingTime: formatTimeShort(wedding.wedding_time),
          weddingCanpoyTime: formatTimeShort(wedding.wedding_canpoy_time),
          venueName: wedding.venue_name,
          venueAddress: wedding.venue_address,
          guestUrl,
          invitationImageMediaId: invitationMediaId,
          whenLabel: templateName === 'wedding_day_before' ? computeWhenLabel(Math.max(0, daysUntilWedding)) : undefined,
        });

        const sendResult = await sendTemplateMessageWithRetry({
          to: guest.phone,
          templateName,
          languageCode: 'he',
          components,
        }, 3);

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
        if (err instanceof WhatsAppQuotaError) {
          await markLogFailed(pending.id, message);
          await pool.query(
            `INSERT INTO wedding_whatsapp_legacy_pauses (wedding_id, template_name, reason)
             VALUES ($1, $2, $3) ON CONFLICT (wedding_id, template_name) DO NOTHING`,
            [wedding.id, templateName, message],
          );
          return;
        }
        if (err instanceof WhatsAppApiError && err.statusCode && err.statusCode >= 400 && err.statusCode < 500 && err.statusCode !== 408) {
          await markLogFailed(pending.id, message);
        }
      }
      await sleep(INTERVAL_MS);
    }
  }

  // חשוב: נועלים את התבנית רק אם באמת בפרודקשן.
  // אחרת, אחרי שתסיר את פילטר הבדיקה, התבנית תהיה כבר "נעולה" והרשימה המלאה לא תקבל כלום.
  if (isProd) {
    await maybeLockTemplate(wedding.id, templateName);
  } else {
    console.log(`[WhatsApp Scheduler] 🧪 isProd=false -> NOT locking template "${templateName}" for wedding_id=${wedding.id}`);
  }
}

export async function runWhatsappSchedulerOnce(): Promise<void> {
  const lockClient = await pool.connect();
  let locked = false;
  try {
    const lockResult = await lockClient.query<{ pg_try_advisory_lock: boolean }>(
      'SELECT pg_try_advisory_lock($1)',
      [ADVISORY_LOCK_KEY],
    );
    locked = Boolean(lockResult.rows[0]?.pg_try_advisory_lock);
    if (!locked) return;
    if (TEST_ONLY_MODE) {
      console.log(`[WhatsApp Scheduler] ⚠️ TEST-ONLY MODE - sending only to ${TEST_FIRST_NAME} / *${TEST_PHONE_SUFFIX}`);
    }

    const weddings = await getWeddingScheduleRows();
    const report = await buildWeddingSchedulePreview();
    console.log(report.text);

    const nowIsrael = getNowIsrael();

    for (const wedding of weddings) {
      if (!wedding.whatsapp_owner_confirmed) {
        console.log(`[WhatsApp Scheduler] ⏭️  Skipping wedding_id=${wedding.id} (${wedding.bride_name} & ${wedding.groom_name}) — whatsapp_owner_confirmed=false`);
        continue;
      }
      await processTemplateForWedding(wedding, 'wedding_confirmation', nowIsrael, IS_PROD);
      await processTemplateForWedding(wedding, 'wedding_reminder', nowIsrael, IS_PROD);
      await processTemplateForWedding(wedding, 'wedding_day_before', nowIsrael, IS_PROD);
      await processTemplateForWedding(wedding, 'wedding_post_thanks', nowIsrael, IS_PROD);
    }
  } finally {
    if (locked) await lockClient.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]).catch(() => undefined);
    lockClient.release();
    console.log(`[WhatsApp Scheduler] 🧪 ========== runWhatsappSchedulerOnce END ==========\n`);
  }
}

export function initWhatsappScheduler(): void {
  if (ENABLED) {
    cron.schedule(
      DEFAULT_CRON,
      () => {
        runWhatsappSchedulerOnce().catch((err) => {
          console.error('[WhatsApp Scheduler] run failed:', err?.message ?? err);
        });
      },
      { timezone: ISRAEL_TIMEZONE },
    );
  }
  if (String(process.env.WHATSAPP_GROUP_SCHEDULER_ENABLED ?? 'false').toLowerCase() === 'true' &&
      String(process.env.IS_PROD ?? 'false').toLowerCase() === 'true' &&
      String(process.env.WHATSAPP_TEST_ONLY ?? 'false').toLowerCase() !== 'true') {
    cron.schedule('* * * * *', () => {
      runWhatsappGroupSchedulerOnce().catch((err) => {
        console.error('[WhatsApp Group Scheduler] run failed:', err?.message ?? err);
      });
    }, { timezone: ISRAEL_TIMEZONE });
  }
}

interface GroupScheduleRow {
  id: string;
  wedding_id: number;
  guest_group_id: string | null;
  template_name: MessageTemplateName;
  scheduled_at: Date;
}

interface GroupDelivery {
  id: string;
  quota_reservation_id: string;
  guest: GuestRow;
}

async function prepareGroupDeliveries(row: GroupScheduleRow): Promise<GroupDelivery[]> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const claimed = await client.query(
      `SELECT 1 FROM wedding_whatsapp_group_schedule
       WHERE id = $1 AND status = 'scheduled' FOR UPDATE`,
      [row.id],
    );
    if (!claimed.rows.length) {
      await client.query('ROLLBACK');
      return [];
    }
    const guests = await getEligibleGuests(row.wedding_id, row.template_name, IS_PROD, row.guest_group_id, client);
    const reservations = await reserveWhatsAppQuotaBatchInTransaction(client, row.template_name, guests.length);
    const deliveries: GroupDelivery[] = [];
    for (let index = 0; index < guests.length; index += 1) {
      const result = await client.query<{ id: string }>(
        `INSERT INTO wedding_whatsapp_group_deliveries
         (schedule_id, wedding_id, guest_id, template_name, quota_reservation_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [row.id, row.wedding_id, guests[index].id, row.template_name, reservations[index]],
      );
      deliveries.push({ id: result.rows[0].id, quota_reservation_id: reservations[index], guest: guests[index] });
    }
    await client.query(
      `UPDATE wedding_whatsapp_group_schedule SET status = $2, updated_at = NOW() WHERE id = $1`,
      [row.id, deliveries.length ? 'processing' : 'completed'],
    );
    await client.query('COMMIT');
    return deliveries;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function processGroupSchedule(row: GroupScheduleRow, wedding: WeddingInfoRow & ScheduleRow, now: DateTime): Promise<void> {
  const scheduledAt = DateTime.fromJSDate(new Date(row.scheduled_at)).setZone(ISRAEL_TIMEZONE);
  const weddingDay = DateTime.fromISO(wedding.wedding_date, { zone: ISRAEL_TIMEZONE }).startOf('day');
  if (row.template_name === 'wedding_confirmation' &&
      (!wedding.invitation_image_media_id || !wedding.bride_name || !wedding.groom_name ||
       !wedding.wedding_date || !wedding.wedding_time || !wedding.wedding_canpoy_time ||
       !process.env.WHATSAPP_PHONE_NUMBER_ID || !process.env.WHATSAPP_ACCESS_TOKEN)) {
    await pool.query(
      `UPDATE wedding_whatsapp_group_schedule SET status = 'paused_schedule', status_detail = $2, updated_at = NOW() WHERE id = $1`,
      [row.id, 'יש להשלים את פרטי האירוע, ההזמנה והגדרות WhatsApp'],
    );
    return;
  }
  if (!process.env.WHATSAPP_PHONE_NUMBER_ID || !process.env.WHATSAPP_ACCESS_TOKEN) {
    await pool.query(
      `UPDATE wedding_whatsapp_group_schedule SET status = 'paused_schedule', status_detail = $2, updated_at = NOW() WHERE id = $1`,
      [row.id, 'הגדרות WhatsApp אינן זמינות'],
    );
    return;
  }
  if (now.diff(scheduledAt, 'minutes').minutes > 1 ||
      (row.template_name !== 'wedding_post_thanks' && now.startOf('day') > weddingDay) ||
      (row.template_name === 'wedding_post_thanks' && now.startOf('day') <= weddingDay)) {
    await pool.query(
      `UPDATE wedding_whatsapp_group_schedule SET status = 'paused_schedule', status_detail = $2, updated_at = NOW() WHERE id = $1`,
      [row.id, 'המועד חלף או אינו מתאים לתאריך האירוע'],
    );
    return;
  }
  let deliveries: GroupDelivery[];
  try {
    deliveries = await prepareGroupDeliveries(row);
  } catch (error) {
    await pool.query(
      `UPDATE wedding_whatsapp_group_schedule SET status = $2, status_detail = $3, updated_at = NOW() WHERE id = $1 AND status = 'scheduled'`,
      [row.id, error instanceof WhatsAppQuotaError ? 'paused_quota' : 'paused_schedule', error instanceof Error ? error.message : 'שגיאה בהכנת השליחה'],
    );
    return;
  }
  for (const delivery of deliveries) {
    const guest = delivery.guest;
    let attempted = false;
    let logId: number | undefined;
    try {
      const currentGuest = await pool.query<{ phone: string; whatsapp_owner_confirmed: boolean; eligible: boolean }>(
        `SELECT g.phone, wi.whatsapp_owner_confirmed,
           (g.guest_group_id IS NOT DISTINCT FROM $3::uuid AND NULLIF(BTRIM(g.phone), '') IS NOT NULL
             AND ($4 = 'wedding_confirmation' OR ($4 = 'wedding_reminder' AND g.rsvp_status = 'PENDING')
               OR ($4 IN ('wedding_day_before', 'wedding_post_thanks') AND g.rsvp_status = 'COMING'))) AS eligible
         FROM guests g JOIN wedding_info wi ON wi.id = g.wedding_id
         WHERE g.id = $1 AND g.wedding_id = $2 AND g.role = 'guest'
         `,
        [guest.id, wedding.id, row.guest_group_id, row.template_name],
      );
      if (currentGuest.rows[0] && !currentGuest.rows[0].whatsapp_owner_confirmed) {
        throw new Error('הרשאת WhatsApp בוטלה במהלך השליחה');
      }
      if (!currentGuest.rows[0]?.eligible) {
        await completeWhatsAppQuotaReservation(delivery.quota_reservation_id, 'rejected');
        await pool.query(`UPDATE wedding_whatsapp_group_deliveries SET status = 'skipped', updated_at = NOW() WHERE id = $1`, [delivery.id]);
        continue;
      }
      guest.phone = currentGuest.rows[0].phone;
      await pool.query(`UPDATE wedding_whatsapp_group_deliveries SET status = 'sending', updated_at = NOW() WHERE id = $1`, [delivery.id]);
      if (row.template_name === 'wedding_confirmation') {
        attempted = true;
        const sent = await sendWeddingConfirmation(wedding, guest, false, delivery.quota_reservation_id);
        if (!sent) {
          await completeWhatsAppQuotaReservation(delivery.quota_reservation_id, 'rejected');
          await pool.query(`UPDATE wedding_whatsapp_group_deliveries SET status = 'skipped', updated_at = NOW() WHERE id = $1`, [delivery.id]);
          continue;
        }
      } else {
        const pending = await upsertPendingLog(wedding.id, guest.id, row.template_name);
        logId = pending.id;
        const daysUntilWedding = Math.round(weddingDay.diff(now.startOf('day'), 'days').days);
        const components = buildTemplateComponents({
          templateName: row.template_name,
          guestFullName: guest.full_name,
          guestFirstName: guest.first_name?.trim() || guest.full_name.split(/\s+/)[0],
          weddingDisplayName: `${wedding.bride_name} & ${wedding.groom_name}`,
          weddingDate: wedding.wedding_date,
          weddingTime: formatTimeShort(wedding.wedding_time),
          weddingCanpoyTime: formatTimeShort(wedding.wedding_canpoy_time),
          venueName: wedding.venue_name,
          venueAddress: wedding.venue_address,
          guestUrl: buildGuestUrl(wedding.id, guest.full_name, guest.phone, TEMPLATE_TO_TAB_INDEX[row.template_name]),
          whenLabel: row.template_name === 'wedding_day_before' ? computeWhenLabel(Math.max(0, daysUntilWedding)) : undefined,
        });
        attempted = true;
        const result = await sendTemplateMessageWithRetry({ to: guest.phone, templateName: row.template_name, languageCode: 'he', components }, 1, delivery.quota_reservation_id);
        await markLogSent(pending.id, result.messageId);
      }
      await pool.query(`UPDATE wedding_whatsapp_group_deliveries SET status = 'sent', updated_at = NOW() WHERE id = $1`, [delivery.id]);
      await sleep(INTERVAL_MS);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'שגיאה בשליחת ההודעה';
      if (!attempted) await completeWhatsAppQuotaReservation(delivery.quota_reservation_id, 'rejected').catch(() => undefined);
      if (logId && error instanceof WhatsAppApiError && error.statusCode && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 408) {
        await markLogFailed(logId, message);
      }
      await pool.query(
        `UPDATE wedding_whatsapp_group_deliveries SET status = $2, error_message = $3, updated_at = NOW() WHERE id = $1`,
        [delivery.id, attempted ? 'unknown' : 'failed', message],
      );
      await pool.query(
        `UPDATE wedding_whatsapp_group_schedule SET status = $2, status_detail = $3, updated_at = NOW() WHERE id = $1`,
        [row.id, 'paused_error', message],
      );
      await pool.query(
        `UPDATE whatsapp_quota_reservations SET status = 'rejected', completed_at = NOW()
         WHERE status = 'reserved' AND id IN (
           SELECT quota_reservation_id FROM wedding_whatsapp_group_deliveries WHERE schedule_id = $1 AND status = 'pending'
         )`,
        [row.id],
      );
      return;
    }
  }
  if (deliveries.length) {
    await pool.query(`UPDATE wedding_whatsapp_group_schedule SET status = 'completed', updated_at = NOW() WHERE id = $1`, [row.id]);
  }
}

export async function runWhatsappGroupSchedulerOnce(): Promise<void> {
  if (!IS_PROD || TEST_ONLY_MODE) return;
  const client = await pool.connect();
  let locked = false;
  try {
    const result = await client.query<{ locked: boolean }>('SELECT pg_try_advisory_lock($1) AS locked', [ADVISORY_LOCK_KEY]);
    locked = Boolean(result.rows[0]?.locked);
    if (!locked) return;
    await pool.query(
      `UPDATE whatsapp_quota_reservations q SET status = 'rejected', completed_at = NOW()
       FROM wedding_whatsapp_group_deliveries d
       JOIN wedding_whatsapp_group_schedule s ON s.id = d.schedule_id
       WHERE s.status = 'processing' AND d.status = 'pending'
         AND q.id = d.quota_reservation_id AND q.status = 'reserved'`,
    );
    await pool.query(
      `UPDATE whatsapp_quota_reservations q SET status = 'unknown', completed_at = NOW()
       FROM wedding_whatsapp_group_deliveries d
       JOIN wedding_whatsapp_group_schedule s ON s.id = d.schedule_id
       WHERE s.status = 'processing' AND d.status = 'sending'
         AND q.id = d.quota_reservation_id AND q.status = 'reserved'`,
    );
    await pool.query(
      `UPDATE wedding_whatsapp_group_deliveries d SET status = 'unknown',
         error_message = $1, updated_at = NOW()
       FROM wedding_whatsapp_group_schedule s
       WHERE s.id = d.schedule_id AND s.status = 'processing' AND d.status = 'sending'`,
      ['השרת הופסק במהלך ניסיון השליחה; יש לבדוק מול WhatsApp לפני ניסיון נוסף'],
    );
    await pool.query(
      `UPDATE wedding_whatsapp_group_deliveries d SET status = 'failed',
         error_message = $1, updated_at = NOW()
       FROM wedding_whatsapp_group_schedule s
       WHERE s.id = d.schedule_id AND s.status = 'processing' AND d.status = 'pending'`,
      ['השליחה נעצרה לפני שהנמען טופל; יש לתזמן מחדש לאחר בדיקה'],
    );
    await pool.query(
      `UPDATE wedding_whatsapp_group_schedule SET status = 'paused_error', status_detail = $1, updated_at = NOW()
       WHERE status = 'processing'`,
      ['השליחה הופסקה ויש לבדוק את מצב ההודעות לפני חידוש'],
    );
    const weddings = await getWeddingScheduleRows();
    const due = await pool.query<GroupScheduleRow>(
      `SELECT id, wedding_id, guest_group_id, template_name, scheduled_at
       FROM wedding_whatsapp_group_schedule WHERE status = 'scheduled' AND scheduled_at <= NOW()
       ORDER BY scheduled_at, id`,
    );
    for (const row of due.rows) {
      const wedding = weddings.find((item) => item.id === row.wedding_id);
      if (!wedding?.whatsapp_owner_confirmed) continue;
      await processGroupSchedule(row, wedding, getNowIsrael());
    }
  } finally {
    if (locked) await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]).catch(() => undefined);
    client.release();
  }
}

interface SchedulePreviewReport {
  text: string;
  html: string;
}

export async function buildWeddingSchedulePreview(): Promise<SchedulePreviewReport> {
  const weddings = await getWeddingScheduleRows();

  let text = `================ WHATSAPP SCHEDULE PREVIEW ================\n\n`;
  let html = `
    <div style="font-family:Arial,sans-serif" dir="ltr">
      <h2>WhatsApp Schedule Preview</h2>
  `;

  for (const wedding of weddings) {
    const computed = computeWeddingMessageScheduleDates(wedding.wedding_date, {
      invitationDaysBefore: wedding.invitation_days_before,
      reminderDaysBefore: wedding.reminder_days_before,
      dayBeforeOffsetDays: wedding.day_before_offset_days,
    });

    const { rows } = await pool.query<{
      total: string;
      coming: string;
      pending: string;
      not_coming: string;
    }>(
      `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE rsvp_status='COMING')::int AS coming,
        COUNT(*) FILTER (WHERE rsvp_status='PENDING')::int AS pending,
        COUNT(*) FILTER (WHERE rsvp_status='NOT_COMING')::int AS not_coming
      FROM guests
      WHERE wedding_id=$1
        AND role='guest'
      `,
      [wedding.id],
    );

    const stats = rows[0];
    const confirmed = wedding.whatsapp_owner_confirmed;
    const permissionText = confirmed
      ? '✅ WhatsApp Permission: CONFIRMED'
      : '❌ WhatsApp Permission: REVOKED — no messages will be sent';

    text +=
      `💍 Wedding ID: ${wedding.id}
👰🤵 ${wedding.bride_name} & ${wedding.groom_name}
📅 Wedding: ${wedding.wedding_date}
${permissionText}

Guests
------
Total: ${stats.total}
Confirmed: ${stats.coming}
Pending: ${stats.pending}
Not coming: ${stats.not_coming}

1) wedding_confirmation
   ${DateTime.fromISO(computed.invitationSendAt)
        .setZone(ISRAEL_TIMEZONE)
        .toFormat('dd/LL/yyyy HH:mm')}
   Recipients: ${stats.total}

2) wedding_reminder
   ${DateTime.fromISO(computed.reminderSendAt)
        .setZone(ISRAEL_TIMEZONE)
        .toFormat('dd/LL/yyyy HH:mm')}
  Recipients: ${stats.pending}

3) wedding_day_before
   ${DateTime.fromISO(computed.dayBeforeSendAt)
        .setZone(ISRAEL_TIMEZONE)
        .toFormat('dd/LL/yyyy HH:mm')}
   Recipients: ${stats.coming}

4) wedding_post_thanks
  ${DateTime.fromISO(computed.postThanksSendAt)
      .setZone(ISRAEL_TIMEZONE)
      .toFormat('dd/LL/yyyy HH:mm')}
  Recipients: ${stats.coming}

-------------------------------------------------------

`;

    html += `
      <div style="margin-bottom:30px;border:1px solid ${confirmed ? '#c3e6cb' : '#f5c6cb'};padding:15px;border-radius:8px;background:${confirmed ? '#f8fff9' : '#fff8f8'}">
        <h3>Wedding #${wedding.id} - ${wedding.bride_name} & ${wedding.groom_name}</h3>

        <p style="
          display:inline-block;
          padding:4px 12px;
          border-radius:20px;
          font-weight:bold;
          font-size:13px;
          background:${confirmed ? '#d4edda' : '#f8d7da'};
          color:${confirmed ? '#155724' : '#721c24'};
          border:1px solid ${confirmed ? '#c3e6cb' : '#f5c6cb'};
        ">
          ${confirmed ? '✅ WhatsApp Permission: CONFIRMED' : '❌ WhatsApp Permission: REVOKED — no messages will be sent'}
        </p>

        <p><b>Date:</b> ${wedding.wedding_date}</p>

        <ul>
          <li>Total Guests: <b>${stats.total}</b></li>
          <li>Confirmed: <b>${stats.coming}</b></li>
          <li>Pending: <b>${stats.pending}</b></li>
          <li>Not Coming: <b>${stats.not_coming}</b></li>
        </ul>

        <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;opacity:${confirmed ? '1' : '0.5'}">
          <tr>
            <th>Template</th>
            <th>Send At</th>
            <th>Recipients</th>
          </tr>
          <tr>
            <td>wedding_confirmation</td>
            <td>${DateTime.fromISO(computed.invitationSendAt)
        .setZone(ISRAEL_TIMEZONE)
        .toFormat('dd/LL/yyyy HH:mm')}</td>
            <td>${stats.total}</td>
          </tr>
          <tr>
            <td>wedding_reminder</td>
            <td>${DateTime.fromISO(computed.reminderSendAt)
        .setZone(ISRAEL_TIMEZONE)
        .toFormat('dd/LL/yyyy HH:mm')}</td>
            <td>${stats.pending}</td>
          </tr>
          <tr>
            <td>wedding_day_before</td>
            <td>${DateTime.fromISO(computed.dayBeforeSendAt)
        .setZone(ISRAEL_TIMEZONE)
        .toFormat('dd/LL/yyyy HH:mm')}</td>
            <td>${stats.coming}</td>
          </tr>
          <tr>
            <td>wedding_post_thanks</td>
            <td>${DateTime.fromISO(computed.postThanksSendAt)
        .setZone(ISRAEL_TIMEZONE)
        .toFormat('dd/LL/yyyy HH:mm')}</td>
            <td>${stats.coming}</td>
          </tr>
        </table>
        ${!confirmed ? `<p style="color:#721c24;font-style:italic;margin-top:8px;">⚠️ All sends are blocked until the couple re-confirms WhatsApp permission.</p>` : ''}
      </div>
    `;
  }

  html += `</div>`;
  text += `================ END SCHEDULE PREVIEW ================`;

  return {
    text,
    html,
  };
}

async function logWeddingSchedulePreview(
  weddings: Array<WeddingInfoRow & ScheduleRow>,
): Promise<void> {
  console.log('\n================ WHATSAPP SCHEDULE PREVIEW ================\n');

  for (const wedding of weddings) {
    const computed = computeWeddingMessageScheduleDates(
      wedding.wedding_date,
      {
        invitationDaysBefore: wedding.invitation_days_before,
        reminderDaysBefore: wedding.reminder_days_before,
        dayBeforeOffsetDays: wedding.day_before_offset_days,
      },
    );

    const { rows: guestStats } = await pool.query<{
      total_guests: string;
      pending_guests: string;
      coming_guests: string;
      not_coming_guests: string;
    }>(
      `
      SELECT
        COUNT(*) FILTER (WHERE role = 'guest') AS total_guests,
        COUNT(*) FILTER (WHERE role = 'guest' AND rsvp_status = 'PENDING') AS pending_guests,
        COUNT(*) FILTER (WHERE role = 'guest' AND rsvp_status = 'COMING') AS coming_guests,
        COUNT(*) FILTER (WHERE role = 'guest' AND rsvp_status = 'NOT_COMING') AS not_coming_guests
      FROM guests
      WHERE wedding_id = $1
      `,
      [wedding.id],
    );

    const stats = guestStats[0];

    const format = (iso: string) =>
      DateTime
        .fromISO(iso, { zone: ISRAEL_TIMEZONE })
        .toFormat('dd/LL/yyyy HH:mm');

    console.log(`
💍 Wedding ID: ${wedding.id}
👰🤵 ${wedding.bride_name} & ${wedding.groom_name}
📅 Wedding date: ${wedding.wedding_date}

👥 Guests:
   Total: ${stats.total_guests}
   ✅ Confirmed: ${stats.coming_guests}
   ⏳ Pending: ${stats.pending_guests}
   ❌ Not coming: ${stats.not_coming_guests}


📨 MESSAGE SCHEDULE:

1) wedding_confirmation
   📅 Send at:
      ${format(computed.invitationSendAt)}
   👥 Recipients:
      ${stats.total_guests} guests
   Rule:
      EVERY guest


2) wedding_reminder
   📅 Send at:
      ${format(computed.reminderSendAt)}
   👥 Recipients:
      ${stats.pending_guests} guests
   Rule:
      Only guests who have not responded (PENDING)


3) wedding_day_before
   📅 Send at:
      ${format(computed.dayBeforeSendAt)}
   👥 Recipients:
      ${stats.coming_guests} guests
   Rule:
      Confirmed guests only


4) wedding_post_thanks
  📅 Send at:
    ${format(computed.postThanksSendAt)}
  👥 Recipients:
    ${stats.coming_guests} guests
  Rule:
    Only confirmed guests
    (COMING)


-------------------------------------------------------------
`);
  }

  console.log('================ END SCHEDULE PREVIEW ================\n');
}

interface WeddingTomorrowEmailTemplate {
  brideName: string;
  groomName: string;

  totalGuests: number;
  confirmedGuests: number;
  pendingGuests: number;
  notComingGuests: number;

  messages: Array<{
    template: 'wedding_confirmation' | 'wedding_reminder' | 'wedding_day_before' | 'wedding_post_thanks';
    sendAt: string;
    recipients: number;
  }>;
}

export function buildTomorrowWhatsappEmail(
  data: WeddingTomorrowEmailTemplate,
): { html: string; text: string } {
  const templateNames: Record<string, string> = {
    wedding_confirmation: '📨 הזמנה לחתונה',
    wedding_reminder: '🔔 תזכורת לאישור הגעה',
    wedding_day_before: '❤️ הודעת יום לפני החתונה',
    wedding_post_thanks: '💛 הודעת תודה אחרי החתונה',
  };

  const rowsHtml = data.messages
    .map(
      (m) => `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #eee;">${templateNames[m.template]}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;">${m.sendAt}</td>
        <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;"><b>${m.recipients}</b></td>
      </tr>
    `,
    )
    .join('');

  const rowsText = data.messages
    .map(
      (m) =>
        `${templateNames[m.template]}
זמן: ${m.sendAt}
נמענים: ${m.recipients}`,
    )
    .join('\n\n');

  const html = `
<div dir="rtl" style="
    font-family:Arial,Helvetica,sans-serif;
    background:#f8f8f8;
    padding:35px;
">

<div style="
    max-width:760px;
    margin:auto;
    background:white;
    border-radius:14px;
    overflow:hidden;
    border:1px solid #ececec;
">

<div style="
    background:linear-gradient(135deg,#b88a2d,#d9b55a);
    color:white;
    padding:30px;
    text-align:center;
">
    <h1 style="margin:0;">💍 WedFlow</h1>
    <p style="margin-top:10px;font-size:18px;">
        מחר תישלחנה הודעות WhatsApp למוזמנים שלכם
    </p>
</div>

<div style="padding:35px;">

<h2 style="margin-top:0;">
שלום ${data.brideName} ו-${data.groomName} ❤️
</h2>

<p style="font-size:16px;line-height:1.8;">
רק רצינו לעדכן אתכם שמערכת <b>WedFlow</b> מתוכננת לבצע
<b>מחר</b> שליחת הודעות WhatsApp אוטומטית למוזמנים שלכם.
</p>

<p style="font-size:16px;">
אין צורך לבצע שום פעולה — אנחנו כבר נדאג לכל השאר ✨
</p>

<hr style="margin:35px 0;">

<h3>📅 ההודעות שיישלחו מחר</h3>

<table style="
width:100%;
border-collapse:collapse;
margin-top:15px;
">
<thead>
<tr style="background:#faf5e8;">
<th style="padding:12px;">סוג הודעה</th>
<th style="padding:12px;">שעת שליחה</th>
<th style="padding:12px;">מספר נמענים</th>
</tr>
</thead>

<tbody>

${rowsHtml}

</tbody>
</table>

<hr style="margin:35px 0;">

<h3>📊 מצב רשימת המוזמנים</h3>

<table style="width:100%;font-size:15px;">
<tr>
<td>👥 סך הכל מוזמנים</td>
<td align="left"><b>${data.totalGuests}</b></td>
</tr>

<tr>
<td>✅ אישרו הגעה</td>
<td align="left"><b>${data.confirmedGuests}</b></td>
</tr>

<tr>
<td>⏳ ממתינים לאישור</td>
<td align="left"><b>${data.pendingGuests}</b></td>
</tr>

<tr>
<td>❌ לא מגיעים</td>
<td align="left"><b>${data.notComingGuests}</b></td>
</tr>
</table>

<hr style="margin:35px 0;">

<h3>ℹ️ מה יקרה מחר?</h3>

<p style="line-height:1.8;">
בשעה המתוכננת המערכת תשלח את הודעות ה־WhatsApp באופן אוטומטי לכל
המוזמנים הרלוונטיים.
</p>

<p style="line-height:1.8;">
לאחר השליחה תוכלו לראות את סטטוסי המסירה והקריאה מתוך מערכת
WedFlow.
</p>

<div style="
margin-top:45px;
padding-top:25px;
border-top:1px solid #eee;
text-align:center;
color:#777;
">

<h2 style="margin-bottom:8px;">
💍 WedFlow
</h2>

<div>
החתונה שלכם. בלי כאבי ראש.
</div>

</div>

</div>

</div>

</div>
`;

  const text = `💍 WedFlow

שלום ${data.brideName} ו-${data.groomName},

מחר מערכת WedFlow תשלח הודעות WhatsApp למוזמנים שלכם.

ההודעות שיישלחו:

${rowsText}

------------------------

מצב רשימת המוזמנים:

סה"כ מוזמנים: ${data.totalGuests}
אישרו: ${data.confirmedGuests}
ממתינים: ${data.pendingGuests}
לא מגיעים: ${data.notComingGuests}

אין צורך לבצע שום פעולה.
המערכת תבצע את השליחה באופן אוטומטי.

WedFlow
החתונה שלכם. בלי כאבי ראש.`;

  return {
    html,
    text,
  };
}