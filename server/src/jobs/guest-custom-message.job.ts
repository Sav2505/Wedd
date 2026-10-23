import cron from 'node-cron';
import { pool } from '../db/pool';
import {
  buildTemplateComponents,
  sendTemplateMessageWithRetry,
} from '../services/whatsapp.service';

const ENABLED = String(process.env.GUEST_CUSTOM_MESSAGE_SCHEDULER_ENABLED ?? 'true').toLowerCase() === 'true';
const LOCK_KEY = 724019233;

interface CampaignRow {
  id: string;
  wedding_id: number;
  audience: 'COMING' | 'PENDING' | 'ALL';
  message_body: string;
  bride_name: string;
  groom_name: string;
  wedding_date: string;
  wedding_time: string | null;
  wedding_canpoy_time: string | null;
  venue_name: string | null;
  venue_address: string | null;
}

interface DeliveryRow {
  id: string;
  guest_first_name: string;
  phone: string;
}

function firstName(value: string): string {
  return value.trim().split(/\s+/)[0] || 'אורח/ת';
}

async function expireDueRequests(): Promise<void> {
  await pool.query(
    `UPDATE wedding_custom_message_requests r
     SET status = 'expired', updated_at = NOW()
     WHERE r.status = 'pending_approval' AND r.scheduled_at <= NOW()`,
  );
  await pool.query(
    `UPDATE wedding_custom_message_requests r
     SET status = 'expired', updated_at = NOW()
     FROM wedding_info wi
     WHERE wi.id = r.wedding_id
       AND r.status = 'approved'
       AND (
         (r.scheduled_at <= NOW() AND wi.whatsapp_owner_confirmed = FALSE)
         OR r.scheduled_at < date_trunc('minute', NOW())
       )`,
  );
}

async function claimDueCampaigns(): Promise<string[]> {
  const { rows } = await pool.query<{ id: string }>(
    `WITH due AS (
       SELECT r.id
       FROM wedding_custom_message_requests r
       JOIN wedding_info wi ON wi.id = r.wedding_id
       WHERE (r.status = 'approved' AND r.scheduled_at <= NOW() AND wi.whatsapp_owner_confirmed = TRUE)
          OR r.status = 'sending'
       ORDER BY r.scheduled_at, r.id
       FOR UPDATE OF r SKIP LOCKED
       LIMIT 10
     )
     UPDATE wedding_custom_message_requests r
     SET status = 'sending', updated_at = NOW()
     FROM due
     WHERE r.id = due.id
     RETURNING r.id`,
  );
  return rows.map((row) => row.id);
}

async function loadCampaign(requestId: string): Promise<CampaignRow | undefined> {
  const { rows } = await pool.query<CampaignRow>(
    `SELECT r.id, r.wedding_id, r.audience, r.message_body,
       wi.bride_name, wi.groom_name, wi.wedding_date::text AS wedding_date,
       wi.wedding_time::text AS wedding_time,
       wi.wedding_canpoy_time::text AS wedding_canpoy_time,
       wi.venue_name, wi.venue_address
     FROM wedding_custom_message_requests r
     JOIN wedding_info wi ON wi.id = r.wedding_id
     WHERE r.id = $1 AND wi.whatsapp_owner_confirmed = TRUE`,
    [requestId],
  );
  return rows[0];
}

async function snapshotRecipients(campaign: CampaignRow): Promise<void> {
  await pool.query(
    `INSERT INTO wedding_custom_message_deliveries
       (request_id, guest_id, guest_first_name, phone)
     SELECT $1, g.id,
       COALESCE(NULLIF(BTRIM(g.first_name), ''), split_part(BTRIM(g.full_name), ' ', 1)),
       BTRIM(g.phone)
     FROM guests g
     WHERE g.wedding_id = $2
       AND g.role = 'guest'
       AND NULLIF(BTRIM(g.phone), '') IS NOT NULL
       AND (
         $3 = 'ALL'
         OR ($3 = 'COMING' AND g.rsvp_status = 'COMING')
         OR ($3 = 'PENDING' AND g.rsvp_status = 'PENDING')
       )
     ON CONFLICT (request_id, guest_id) DO NOTHING`,
    [campaign.id, campaign.wedding_id, campaign.audience],
  );
}

async function sendCampaign(campaign: CampaignRow): Promise<void> {
  await snapshotRecipients(campaign);
  const { rows: deliveries } = await pool.query<DeliveryRow>(
    `SELECT id, guest_first_name, phone
     FROM wedding_custom_message_deliveries
     WHERE request_id = $1 AND status = 'pending'
     ORDER BY id`,
    [campaign.id],
  );

  for (const delivery of deliveries) {
    try {
      const components = buildTemplateComponents({
        templateName: 'wedding_custom_message',
        guestFullName: delivery.guest_first_name,
        guestFirstName: firstName(delivery.guest_first_name),
        weddingDisplayName: `${campaign.bride_name} ו${campaign.groom_name}`,
        weddingDate: campaign.wedding_date,
        weddingTime: campaign.wedding_time ?? '',
        weddingCanpoyTime: campaign.wedding_canpoy_time ?? '',
        venueName: campaign.venue_name ?? '',
        venueAddress: campaign.venue_address ?? '',
        guestUrl: '',
        customMessage: campaign.message_body,
      });
      const result = await sendTemplateMessageWithRetry({
        to: delivery.phone,
        templateName: 'wedding_custom_message',
        languageCode: 'he',
        components,
      });
      await pool.query(
        `UPDATE wedding_custom_message_deliveries
         SET status = 'sent', whatsapp_message_id = $2, sent_at = NOW(),
           attempt_count = attempt_count + $3, last_attempt_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [delivery.id, result.messageId, result.attempts],
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await pool.query(
        `UPDATE wedding_custom_message_deliveries
         SET status = 'failed', error_message = $2, attempt_count = attempt_count + 1,
           last_attempt_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [delivery.id, message.slice(0, 1000)],
      );
      console.error(`[Guest custom message] Delivery ${delivery.id} failed:`, message);
    }
  }

  await pool.query(
    `UPDATE wedding_custom_message_requests r
     SET status = CASE WHEN EXISTS (
       SELECT 1 FROM wedding_custom_message_deliveries d
       WHERE d.request_id = r.id AND d.status = 'failed'
     ) THEN 'sent_with_errors' ELSE 'sent' END,
       sent_at = NOW(), updated_at = NOW()
     WHERE r.id = $1 AND r.status = 'sending'`,
    [campaign.id],
  );
}

export async function runGuestCustomMessageSchedulerOnce(): Promise<void> {
  const lockClient = await pool.connect();
  try {
    const { rows } = await lockClient.query<{ locked: boolean }>(
      'SELECT pg_try_advisory_lock($1) AS locked',
      [LOCK_KEY],
    );
    if (!rows[0]?.locked) return;

    await expireDueRequests();
    const requestIds = await claimDueCampaigns();
    for (const requestId of requestIds) {
      try {
        const campaign = await loadCampaign(requestId);
        if (!campaign) {
          await pool.query(
            `UPDATE wedding_custom_message_requests
             SET status = 'expired', updated_at = NOW()
             WHERE id = $1 AND status = 'sending'`,
            [requestId],
          );
          continue;
        }
        await sendCampaign(campaign);
      } catch (error) {
        console.error(`[Guest custom message] Campaign ${requestId} failed:`, error);
      }
    }
  } finally {
    await lockClient.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]).catch(() => undefined);
    lockClient.release();
  }
}

export function initGuestCustomMessageScheduler(): void {
  if (!ENABLED) {
    console.log('[Guest custom message] scheduler disabled by env flag.');
    return;
  }
  cron.schedule('* * * * *', () => {
    runGuestCustomMessageSchedulerOnce().catch((error) => {
      console.error('[Guest custom message] scheduler run failed:', error?.message ?? error);
    });
  }, { timezone: 'Asia/Jerusalem' });
}