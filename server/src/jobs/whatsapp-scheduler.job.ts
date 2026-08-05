import cron from 'node-cron';
import { DateTime } from 'luxon';
import { pool } from '../db/pool';
import {
  buildTemplateComponents,
  sendTemplateMessageWithRetry,
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
): Promise<GuestRow[]> {
  const templateFilter =
    templateName === 'wedding_reminder'
      ? "AND g.rsvp_status <> 'COMING'"
      : templateName === 'wedding_post_thanks'
        ? "AND g.rsvp_status = 'COMING'"
      : '';

  // בסביבת בדיקות (לא IS_PROD) - שולחים אך ורק לאיש הבדיקה, בתוך אותה חתונה
  const testFilter = !isProd
    ? `AND g.phone LIKE '%${TEST_PHONE_SUFFIX}' AND TRIM(g.first_name) = '${TEST_FIRST_NAME} LIMIT 1'`
    : '';

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
       ${templateFilter}
       ${testFilter}
       AND (
         l.id IS NULL
         OR l.status NOT IN ('sent', 'delivered', 'read')
       )
     ORDER BY g.created_at ASC`;

  const { rows } = await pool.query<GuestRow>(query, [weddingId, templateName]);

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

      const pending = await upsertPendingLog(wedding.id, guest.id, templateName);
      try {
        const guestFirstName = (guest.first_name?.trim() || guest.full_name.split(/\s+/)[0] || '').trim();
        const weddingDisplayName = `${wedding.bride_name} & ${wedding.groom_name}`;
        const guestUrl = buildGuestUrl(wedding.id, guest.full_name, guest.phone);

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
        await markLogFailed(pending.id, message);
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
  const lockResult = await pool.query<{ pg_try_advisory_lock: boolean }>(
    'SELECT pg_try_advisory_lock($1)',
    [ADVISORY_LOCK_KEY],
  );
  if (!lockResult.rows[0]?.pg_try_advisory_lock) {
    return;
  }
  try {
    if (!IS_PROD) {
      console.log(`[WhatsApp Scheduler] ⚠️ TEST MODE - sending only to ${TEST_FIRST_NAME} / *${TEST_PHONE_SUFFIX}`);
    }

    const weddings = await getWeddingScheduleRows();
    const report = await buildWeddingSchedulePreview();
    console.log(report.text);

    const nowIsrael = getNowIsrael();

    for (const wedding of weddings) {
      await processTemplateForWedding(wedding, 'wedding_confirmation', nowIsrael, IS_PROD);
      await processTemplateForWedding(wedding, 'wedding_reminder', nowIsrael, IS_PROD);
      await processTemplateForWedding(wedding, 'wedding_day_before', nowIsrael, IS_PROD);
      await processTemplateForWedding(wedding, 'wedding_post_thanks', nowIsrael, IS_PROD);
    }
  } finally {
    await pool.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]);
    console.log(`[WhatsApp Scheduler] 🧪 ========== runWhatsappSchedulerOnce END ==========\n`);
  }
}

export function initWhatsappScheduler(): void {
  if (!ENABLED) {
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

    text +=
      `💍 Wedding ID: ${wedding.id}
👰🤵 ${wedding.bride_name} & ${wedding.groom_name}
📅 Wedding: ${wedding.wedding_date}

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
   Recipients: ${Number(stats.pending) + Number(stats.not_coming)}

3) wedding_day_before
   ${DateTime.fromISO(computed.dayBeforeSendAt)
        .setZone(ISRAEL_TIMEZONE)
        .toFormat('dd/LL/yyyy HH:mm')}
   Recipients: ${stats.total}

4) wedding_post_thanks
  ${DateTime.fromISO(computed.postThanksSendAt)
      .setZone(ISRAEL_TIMEZONE)
      .toFormat('dd/LL/yyyy HH:mm')}
  Recipients: ${stats.coming}

-------------------------------------------------------

`;

    html += `
      <div style="margin-bottom:30px;border:1px solid #ddd;padding:15px;border-radius:8px;">
        <h3>Wedding #${wedding.id} - ${wedding.bride_name} & ${wedding.groom_name}</h3>

        <p><b>Date:</b> ${wedding.wedding_date}</p>

        <ul>
          <li>Total Guests: <b>${stats.total}</b></li>
          <li>Confirmed: <b>${stats.coming}</b></li>
          <li>Pending: <b>${stats.pending}</b></li>
          <li>Not Coming: <b>${stats.not_coming}</b></li>
        </ul>

        <table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;">
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
            <td>${Number(stats.pending) + Number(stats.not_coming)}</td>
          </tr>
          <tr>
            <td>wedding_day_before</td>
            <td>${DateTime.fromISO(computed.dayBeforeSendAt)
        .setZone(ISRAEL_TIMEZONE)
        .toFormat('dd/LL/yyyy HH:mm')}</td>
            <td>${stats.total}</td>
          </tr>
          <tr>
            <td>wedding_post_thanks</td>
            <td>${DateTime.fromISO(computed.postThanksSendAt)
        .setZone(ISRAEL_TIMEZONE)
        .toFormat('dd/LL/yyyy HH:mm')}</td>
            <td>${stats.coming}</td>
          </tr>
        </table>
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
      ${Number(stats.pending_guests) + Number(stats.not_coming_guests)} guests
   Rule:
      Only guests who did NOT confirm
      (PENDING + NOT_COMING)


3) wedding_day_before
   📅 Send at:
      ${format(computed.dayBeforeSendAt)}
   👥 Recipients:
      ${stats.total_guests} guests
   Rule:
      EVERY guest


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