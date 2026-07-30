import cron from 'node-cron';
import { DateTime } from 'luxon';
import { sendEmail } from '../services/mailer.service';
import { getReconciliationIssues } from '../services/weddingMessageLog.service';
import { ISRAEL_TIMEZONE } from '../utils/scheduling.util';

const DEFAULT_CRON = process.env.WHATSAPP_RECONCILIATION_CRON ?? '0 20 * * *';
// תוקן: דגל נפרד מה-scheduler הראשי, כדי שאפשר לכבות אחד בלי השני
const ENABLED = String(process.env.WHATSAPP_RECONCILIATION_ENABLED ?? 'true').toLowerCase() === 'true';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildDigestHtml(rows: Awaited<ReturnType<typeof getReconciliationIssues>>): string {
  const bodyRows = rows
    .map((row) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(row.wedding_name)}</td>
        <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(row.guest_name)}</td>
        <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(row.template_name)}</td>
        <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(row.status)}</td>
        <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(row.error_message ?? '')}</td>
        <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(row.updated_at)}</td>
      </tr>
    `)
    .join('');

  return `
    <div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;">
      <h2>דוח חריגות WhatsApp יומי</h2>
      <p>נמצאו רשומות שנכשלו או שטרם התקבל להן אישור מסירה בזמן:</p>
      <table style="border-collapse:collapse;width:100%;">
        <thead>
          <tr>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">חתונה</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">אורח</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">תבנית</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">סטטוס</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">שגיאה</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">עודכן ב-</th>
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>
  `;
}

function buildDigestText(rows: Awaited<ReturnType<typeof getReconciliationIssues>>): string {
  const lines = rows.map((row) => {
    return [
      `חתונה: ${row.wedding_name}`,
      `אורח: ${row.guest_name}`,
      `תבנית: ${row.template_name}`,
      `סטטוס: ${row.status}`,
      `שגיאה: ${row.error_message ?? '-'}`,
      `עודכן ב: ${row.updated_at}`,
      '---',
    ].join('\n');
  });

  return `דוח חריגות WhatsApp יומי\n\n${lines.join('\n')}`;
}

export async function runWhatsappReconciliationOnce(): Promise<void> {
  const recipient = process.env.SOFTWARE_EMAIL;
  if (!recipient) {
    console.log('[WhatsApp Reconciliation] skipped: SOFTWARE_EMAIL is not configured.');
    return;
  }

  const issues = await getReconciliationIssues(2);
  if (issues.length === 0) {
    return;
  }

  const now = DateTime.now().setZone(ISRAEL_TIMEZONE).toFormat('dd/LL/yyyy HH:mm');
  await sendEmail({
    to: recipient,
    subject: `דוח חריגות WhatsApp - ${now}`,
    html: buildDigestHtml(issues),
    text: buildDigestText(issues),
  });
}

export function initWhatsappReconciliationJob(): void {
  if (!ENABLED) {
    console.log('[WhatsApp Reconciliation] disabled by env flag.');
    return;
  }

  cron.schedule(
    DEFAULT_CRON,
    () => {
      runWhatsappReconciliationOnce().catch((err) => {
        console.error('[WhatsApp Reconciliation] run failed:', err?.message ?? err);
      });
    },
    { timezone: ISRAEL_TIMEZONE },
  );

  console.log(`[WhatsApp Reconciliation] initialized with cron "${DEFAULT_CRON}" (${ISRAEL_TIMEZONE}).`);
}