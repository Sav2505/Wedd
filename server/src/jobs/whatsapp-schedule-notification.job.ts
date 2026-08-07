// whatsapp-schedule-notification.job.ts

import cron from 'node-cron';
import { DateTime } from 'luxon';
import { pool } from '../db/pool';
import { ISRAEL_TIMEZONE, computeWeddingMessageScheduleDates, computeWhenLabel } from '../utils/scheduling.util';
import { sendMail } from '../services/email.service';
import {
  buildTomorrowWhatsappNotificationEmail,
  TomorrowWhatsappScheduledMessage,
} from '../services/emailTemplates.service';

const DEFAULT_CRON =
  process.env.WHATSAPP_SCHEDULE_NOTIFICATION_CRON ?? '0 12 * * *';

const ENABLED =
  String(
    process.env.WHATSAPP_SCHEDULE_NOTIFICATION_ENABLED ?? 'true',
  ).toLowerCase() === 'true';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WeddingScheduleRow {
  id: number;
  bride_name: string;
  groom_name: string;
  wedding_date: string;
  wedding_time: string | null;
  wedding_canpoy_time: string | null;
  venue_name: string | null;
  whatsapp_owner_confirmed: boolean;
  invitation_days_before: number;
  reminder_days_before: number;
  day_before_offset_days: number;
  invitation_locked_at: string | null;
  reminder_locked_at: string | null;
  day_before_locked_at: string | null;
  post_thanks_locked_at: string | null;
}

interface GuestStats {
  total: number;
  confirmed: number;
  pending: number;
  notComing: number;
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function getWeddingScheduleRows(): Promise<WeddingScheduleRow[]> {
  const { rows } = await pool.query<WeddingScheduleRow>(
    `SELECT
      wi.id,
      wi.bride_name,
      wi.groom_name,
      wi.wedding_date,
      wi.wedding_time,
      wi.wedding_canpoy_time,
      wi.venue_name,
      wi.whatsapp_owner_confirmed,
      s.invitation_days_before,
      s.reminder_days_before,
      s.day_before_offset_days,
      s.invitation_locked_at,
      s.reminder_locked_at,
      s.day_before_locked_at,
      s.post_thanks_locked_at
     FROM wedding_info wi
     JOIN wedding_message_schedule s ON s.wedding_id = wi.id`,
  );
  return rows;
}

async function getCoupleEmail(
  weddingId: number,
): Promise<string | null> {
  const { rows } = await pool.query<{ email: string }>(
    `SELECT email
     FROM wedding_info WHERE id = $1
     LIMIT 1`,
    [weddingId],
  );
  return rows[0]?.email ?? null;
}

async function getGuestStats(weddingId: number): Promise<GuestStats> {
  const { rows } = await pool.query<{
    total: string;
    confirmed: string;
    pending: string;
    not_coming: string;
  }>(
    `SELECT
      COUNT(*) FILTER (WHERE role = 'guest')::int             AS total,
      COUNT(*) FILTER (WHERE role = 'guest' AND rsvp_status = 'COMING')::int      AS confirmed,
      COUNT(*) FILTER (WHERE role = 'guest' AND rsvp_status = 'PENDING')::int     AS pending,
      COUNT(*) FILTER (WHERE role = 'guest' AND rsvp_status = 'NOT_COMING')::int  AS not_coming
     FROM guests
     WHERE wedding_id = $1`,
    [weddingId],
  );
  const row = rows[0];
  return {
    total: Number(row?.total ?? 0),
    confirmed: Number(row?.confirmed ?? 0),
    pending: Number(row?.pending ?? 0),
    notComing: Number(row?.not_coming ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Message preview builder
// ---------------------------------------------------------------------------

function formatTime(time: string | null | undefined): string {
  if (!time) return '';
  return time.slice(0, 5); // HH:MM
}

function formatWeddingDate(weddingDate: string): string {
  try {
    const d = DateTime.fromISO(weddingDate, { zone: ISRAEL_TIMEZONE });
    if (!d.isValid) return weddingDate;
    return d.setLocale('he').toFormat('cccc, dd LLLL yyyy');
  } catch {
    return weddingDate;
  }
}

function buildMessagePreviews(
  wedding: WeddingScheduleRow,
  templateNames: ReadonlyArray<'wedding_confirmation' | 'wedding_reminder' | 'wedding_day_before' | 'wedding_post_thanks'>,
  sendAtFormattedMap: Record<string, string>,
  stats: GuestStats,
): TomorrowWhatsappScheduledMessage[] {
  const receptionTime = formatTime(wedding.wedding_time);
  const canopyTime = formatTime(wedding.wedding_canpoy_time);
  const formattedDate = formatWeddingDate(wedding.wedding_date);
  const coupleNames = `${wedding.bride_name} & ${wedding.groom_name}`;
  const venueName = wedding.venue_name ?? '';
  const sampleGuest = 'יואב'; // representative guest name for preview

  return templateNames.map((templateName): TomorrowWhatsappScheduledMessage => {
    let messageHeader = '';
    let messageBody = '';
    let recipientCount = 0;

    if (templateName === 'wedding_confirmation') {
      messageHeader = `שלום ${sampleGuest}! 💌`;
      messageBody =
        `בשמחה ובהתרגשות גדולה,\n` +
        `אנו מזמינים אותך לקחת חלק ביום המאושר בחיינו! 💍✨\n\n` +
        `📅 מועד האירוע: ${formattedDate}\n` +
        `🥂 קבלת פנים: ${receptionTime}\n` +
        `⛪ חופה: ${canopyTime}\n\n` +
        `נשמח מאוד אם תאשר/י את הגעתך באמצעות הכפתור למטה, כדי שנוכל להיערך בצורה הטובה ביותר. 🙏\n\n` +
        `מחכים להתרגש, לשמוח ולחגוג איתך 🥂❤️\n\n` +
        `באהבה,\n${coupleNames} 💕`;
      recipientCount = stats.total;

    } else if (templateName === 'wedding_reminder') {
      messageHeader = `רק תזכורת קטנה... 💛`;
      messageBody =
        `שלום ${sampleGuest} 😊\n\n` +
        `טרם קיבלנו את אישור הגעתך לחתונה שלנו, וחשוב לנו לדעת אם נזכה לחגוג איתך את היום המיוחד שלנו. 💍✨\n\n` +
        `📅 מועד האירוע: ${formattedDate}\n` +
        `🥂 קבלת פנים: ${receptionTime}\n` +
        `⛪ חופה: ${canopyTime}\n\n` +
        `נשמח מאוד אם תוכל/י לאשר את הגעתך באמצעות הכפתור למטה, כדי שנוכל להיערך בצורה הטובה ביותר. 🙏\n\n` +
        `מחכים ומקווים לחגוג איתך! ❤️\n\n` +
        `באהבה,\n${coupleNames} 💕`;
      recipientCount = stats.pending + stats.notComing;

    } else if (templateName === 'wedding_day_before') {
      // Compute days from the scheduled send date to the wedding date for the whenLabel
      const dayBeforeSendDate = DateTime.fromISO(sendAtFormattedMap[templateName], { zone: ISRAEL_TIMEZONE });
      const weddingDay = DateTime.fromISO(wedding.wedding_date, { zone: ISRAEL_TIMEZONE }).startOf('day');
      const daysUntil = Math.round(weddingDay.diff(dayBeforeSendDate.startOf('day'), 'days').days);
      const whenLabel = computeWhenLabel(Math.max(1, daysUntil));
      // wedding_day_before
      messageHeader = `💍✨ מחר אנחנו מתחתנים ✨💍`;
      messageBody =
        `שלום ${sampleGuest} ❤️\n\n` +
        `מחכים ומתרגשים לראותכם ${whenLabel} בחתונה של ${coupleNames} 🥂💍\n\n` +
        `📍 *מיקום האירוע:* ${venueName}\n` +
        `🥂 *קבלת פנים:* ${receptionTime}\n` +
        `⛪ *חופה:* ${canopyTime}\n\n` +
        `דרך ההזמנה הדיגיטלית שלנו מחכים לך כל הפרטים שתצטרך/י:\n` +
        `📍 ניווט ישירות ל-Waze\n` +
        `🪑 מיקום הישיבה שלך\n` +
        `🎁 מתנה לחתן/כלה דרך קישור ל-Bit\n` +
        `📸 גלריה משותפת להעלאת תמונות מהאירוע\n` +
        `ℹ️ מידע על האירוע\n\n` +
        `💛 מומלץ להגיע מספר דקות לפני קבלת הפנים, ליהנות מהאווירה, ממנות הפתיחה ולהתחיל את החגיגות איתנו.\n\n` +
        `באהבה,\n${coupleNames} 💕`;
      recipientCount = stats.total;

    } else {
      // wedding_post_thanks
      messageHeader = `💛 תודה שהיית חלק מהיום המיוחד שלנו!`;
      messageBody =
        `שלום ${sampleGuest} ❤️\n\n` +
        `רצינו לומר לך תודה ענקית שהגעת לחגוג איתנו את אחד הימים המרגשים והמשמעותיים בחיינו. 💍🥂\n\n` +
        `היה לנו כיף גדול לראות אותך בין האורחים, ואנחנו מקווים שנהנית מהערב לפחות כמו שאנחנו נהנינו. ✨\n\n` +
        `📸 נשמח אם תוכל/י לצרף את התמונות שצילמת לגלריה המשותפת שלנו באפליקציה, כדי שכולנו נוכל ליהנות מהם ולהיזכר ברגעים היפים. ❤️\n\n` +
        `תודה שהיית חלק מהזיכרונות שלנו.\n` +
        `הנוכחות שלך הפכה את היום הזה למיוחד עוד יותר. 💕\n\n` +
        `באהבה ובהערכה,\n${coupleNames} 💛`;
      recipientCount = stats.confirmed;
    }

    return {
      templateName,
      sendAt: sendAtFormattedMap[templateName],
      recipientCount,
      messageHeader,
      messageBody,
    };
  });
}

// ---------------------------------------------------------------------------
// Main job function
// ---------------------------------------------------------------------------

export async function runWhatsappScheduleNotificationOnce(): Promise<void> {
  console.log(
    `[WhatsApp Schedule Notification] Running (${DateTime.now()
      .setZone(ISRAEL_TIMEZONE)
      .toFormat('dd/LL/yyyy HH:mm')})`,
  );

  const weddings = await getWeddingScheduleRows();
  const nowIsrael = DateTime.now().setZone(ISRAEL_TIMEZONE);
  const tomorrowIsrael = nowIsrael.plus({ days: 1 });
  const tomorrowISODate = tomorrowIsrael.toISODate();
  // Saturday = weekday 6 in Luxon. If tomorrow is Shabbat, we look ahead to
  // Sunday instead and send the notification today (Friday) with "מחרתיים".
  const tomorrowIsSaturday = tomorrowIsrael.weekday === 6;
  const dayAfterTomorrowISODate = tomorrowIsSaturday
    ? nowIsrael.plus({ days: 2 }).toISODate()
    : null;
  const sendLabel: 'מחר' | 'מחרתיים' = tomorrowIsSaturday ? 'מחרתיים' : 'מחר';

  if (!tomorrowISODate) {
    console.error('[WhatsApp Schedule Notification] Failed to compute tomorrow date');
    return;
  }

  for (const wedding of weddings) {
    try {
      if (!wedding.whatsapp_owner_confirmed) {
        console.log(
          `[WhatsApp Schedule Notification] ⏭️  Skipping wedding #${wedding.id} (${wedding.bride_name} & ${wedding.groom_name}) — whatsapp_owner_confirmed=false`,
        );
        continue;
      }

      const computed = computeWeddingMessageScheduleDates(wedding.wedding_date, {
        invitationDaysBefore: wedding.invitation_days_before,
        reminderDaysBefore: wedding.reminder_days_before,
        dayBeforeOffsetDays: wedding.day_before_offset_days,
      });

      // Map each template to its ISO send date and formatted display string
      const isoDateMap: Record<string, string> = {
        wedding_confirmation: DateTime.fromISO(computed.invitationSendAt, { zone: ISRAEL_TIMEZONE }).toISODate() ?? '',
        wedding_reminder: DateTime.fromISO(computed.reminderSendAt, { zone: ISRAEL_TIMEZONE }).toISODate() ?? '',
        wedding_day_before: DateTime.fromISO(computed.dayBeforeSendAt, { zone: ISRAEL_TIMEZONE }).toISODate() ?? '',
        wedding_post_thanks: DateTime.fromISO(computed.postThanksSendAt, { zone: ISRAEL_TIMEZONE }).toISODate() ?? '',
      };

      const formattedMap: Record<string, string> = {
        wedding_confirmation: DateTime.fromISO(computed.invitationSendAt, { zone: ISRAEL_TIMEZONE }).toFormat('dd/LL/yyyy HH:mm'),
        wedding_reminder: DateTime.fromISO(computed.reminderSendAt, { zone: ISRAEL_TIMEZONE }).toFormat('dd/LL/yyyy HH:mm'),
        wedding_day_before: DateTime.fromISO(computed.dayBeforeSendAt, { zone: ISRAEL_TIMEZONE }).toFormat('dd/LL/yyyy HH:mm'),
        wedding_post_thanks: DateTime.fromISO(computed.postThanksSendAt, { zone: ISRAEL_TIMEZONE }).toFormat('dd/LL/yyyy HH:mm'),
      };

      const lockedMap: Record<string, boolean> = {
        wedding_confirmation: Boolean(wedding.invitation_locked_at),
        wedding_reminder: Boolean(wedding.reminder_locked_at),
        wedding_day_before: Boolean(wedding.day_before_locked_at),
        wedding_post_thanks: Boolean(wedding.post_thanks_locked_at),
      };

      // Include templates that:
      // - fire tomorrow (normal case), OR
      // - fire on Sunday when tomorrow is Saturday → notify today (Friday) with "מחרתיים"
      const templatesTomorrow = (
        ['wedding_confirmation', 'wedding_reminder', 'wedding_day_before', 'wedding_post_thanks'] as const
      ).filter((t) => {
        if (lockedMap[t]) return false;
        if (isoDateMap[t] === tomorrowISODate) return true;
        if (tomorrowIsSaturday && dayAfterTomorrowISODate && isoDateMap[t] === dayAfterTomorrowISODate) return true;
        return false;
      });

      if (templatesTomorrow.length === 0) {
        continue;
      }

      console.log(
        `[WhatsApp Schedule Notification] Wedding #${wedding.id} (${wedding.bride_name} & ${wedding.groom_name}) ` +
        `- templates firing ${sendLabel}: ${templatesTomorrow.join(', ')}`,
      );

      const [stats, coupleEmail] = await Promise.all([
        getGuestStats(wedding.id),
        getCoupleEmail(wedding.id),
      ]);

      if (!coupleEmail) {
        console.warn(
          `[WhatsApp Schedule Notification] No email found for wedding #${wedding.id} (${wedding.bride_name} & ${wedding.groom_name}) - skipping`,
        );
        continue;
      }

      const scheduledMessages = buildMessagePreviews(
        wedding,
        templatesTomorrow,
        formattedMap,
        stats,
      );

      const { html, text, subject } = buildTomorrowWhatsappNotificationEmail({
        brideName: wedding.bride_name,
        groomName: wedding.groom_name,
        totalGuests: stats.total,
        confirmedGuests: stats.confirmed,
        pendingGuests: stats.pending,
        notComingGuests: stats.notComing,
        scheduledMessages,
        sendLabel,
      });

      await sendMail({ to: coupleEmail, subject, html, text });

      console.log(
        `[WhatsApp Schedule Notification] Email sent to ${coupleEmail} for wedding #${wedding.id}`,
      );
    } catch (err: any) {
      console.error(
        `[WhatsApp Schedule Notification] Error processing wedding #${wedding.id}:`,
        err?.message ?? err,
      );
    }
  }

  console.log('[WhatsApp Schedule Notification] Done.');
}

export function initWhatsappScheduleNotificationJob(): void {
  if (!ENABLED) {
    console.log(
      '[WhatsApp Schedule Notification] disabled by env flag.',
    );
    return;
  }

  cron.schedule(
    DEFAULT_CRON,
    () => {
      runWhatsappScheduleNotificationOnce().catch((err) => {
        console.error(
          '[WhatsApp Schedule Notification] run failed:',
          err?.message ?? err,
        );
      });
    },
    {
      timezone: ISRAEL_TIMEZONE,
    },
  );

  console.log(
    `[WhatsApp Schedule Notification] initialized with cron "${DEFAULT_CRON}" (${ISRAEL_TIMEZONE}).`,
  );
}