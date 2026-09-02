import { pool } from '../db/pool';

export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
export type MessageTemplateName = 'wedding_confirmation' | 'wedding_reminder' | 'wedding_day_before' | 'wedding_post_thanks';

export interface MessageLogRow {
  id: number;
  wedding_id: number;
  guest_id: string;
  template_name: MessageTemplateName;
  status: DeliveryStatus;
  whatsapp_message_id: string | null;
  error_message: string | null;
  attempt_count: number;
  last_attempt_at: string | null;
  created_at: string;
  updated_at: string;
}

interface UpsertPendingResult {
  id: number;
  attempt_count: number;
}

let ensureSchemaPromise: Promise<void> | null = null;

async function ensureWeddingMessageLogSchema(): Promise<void> {
  if (!ensureSchemaPromise) {
    ensureSchemaPromise = (async () => {
      const { rows } = await pool.query<{ needsUpdate: boolean }>(`
        SELECT NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'chk_wml_template_name'
            AND pg_get_constraintdef(oid) LIKE '%wedding_post_thanks%'
        ) AS "needsUpdate"
      `);

      if (!rows[0]?.needsUpdate) {
        return;
      }

      await pool.query(`
        ALTER TABLE wedding_message_log
        DROP CONSTRAINT IF EXISTS chk_wml_template_name
      `);

      await pool.query(`
        ALTER TABLE wedding_message_log
        ADD CONSTRAINT chk_wml_template_name
          CHECK (template_name IN ('wedding_confirmation', 'wedding_reminder', 'wedding_day_before', 'wedding_post_thanks'))
          NOT VALID
      `);
    })().catch((err) => {
      ensureSchemaPromise = null;
      throw err;
    });
  }

  await ensureSchemaPromise;
}

export async function upsertPendingLog(
  weddingId: number,
  guestId: string,
  templateName: MessageTemplateName,
): Promise<UpsertPendingResult> {
  await ensureWeddingMessageLogSchema();

  const { rows } = await pool.query<UpsertPendingResult>(
    `INSERT INTO wedding_message_log
      (wedding_id, guest_id, template_name, status, attempt_count, last_attempt_at, created_at, updated_at)
     VALUES
      ($1, $2, $3, 'pending', 1, NOW(), NOW(), NOW())
     ON CONFLICT (wedding_id, guest_id, template_name)
     DO UPDATE SET
       status = 'pending',
       attempt_count = wedding_message_log.attempt_count + 1,
       last_attempt_at = NOW(),
       updated_at = NOW()
     RETURNING id, attempt_count`,
    [weddingId, guestId, templateName],
  );

  return rows[0];
}

export async function markLogSent(
  logId: number,
  whatsappMessageId: string,
): Promise<void> {
  await pool.query(
    `UPDATE wedding_message_log
     SET status = 'sent',
         whatsapp_message_id = $1,
         error_message = NULL,
         updated_at = NOW()
     WHERE id = $2`,
    [whatsappMessageId, logId],
  );
}

export async function markLogFailed(logId: number, errorMessage: string): Promise<void> {
  await pool.query(
    `UPDATE wedding_message_log
     SET status = 'failed',
         error_message = $1,
         updated_at = NOW()
     WHERE id = $2`,
    [errorMessage, logId],
  );
}

export async function updateLogStatusByWhatsappMessageId(
  whatsappMessageId: string,
  nextStatus: DeliveryStatus,
  errorMessage?: string,
): Promise<void> {
  const statusPriority: Record<DeliveryStatus, number> = {
    pending: 0,
    sent: 1,
    delivered: 2,
    read: 3,
    failed: 4,
  };

  const { rows } = await pool.query<Pick<MessageLogRow, 'id' | 'status'>>(
    `SELECT id, status
     FROM wedding_message_log
     WHERE whatsapp_message_id = $1
     LIMIT 1`,
    [whatsappMessageId],
  );

  if (!rows[0]) {
    return;
  }

  const current = rows[0];
  const shouldUpdate =
    nextStatus === 'failed' ||
    statusPriority[nextStatus] >= statusPriority[current.status];

  if (!shouldUpdate) {
    return;
  }

  await pool.query(
    `UPDATE wedding_message_log
     SET status = $1,
         error_message = COALESCE($2, error_message),
         updated_at = NOW()
     WHERE id = $3`,
    [nextStatus, errorMessage ?? null, current.id],
  );
}

export interface ReconciliationIssueRow {
  wedding_id: number;
  wedding_name: string;
  guest_name: string;
  template_name: string;
  status: DeliveryStatus;
  error_message: string | null;
  updated_at: string;
}

export async function getReconciliationIssues(staleHours = 2): Promise<ReconciliationIssueRow[]> {
  const { rows } = await pool.query<ReconciliationIssueRow>(
    `SELECT
      l.wedding_id,
      CONCAT(wi.groom_name, ' + ', wi.bride_name) AS wedding_name,
      g.full_name AS guest_name,
      l.template_name,
      l.status,
      l.error_message,
      l.updated_at
    FROM wedding_message_log l
    JOIN guests g ON g.id = l.guest_id
    JOIN wedding_info wi ON wi.id = l.wedding_id
    WHERE (
      (l.status = 'sent' AND l.updated_at <= NOW() - make_interval(hours => $1::int))
      OR l.status = 'failed'
    )
    ORDER BY l.updated_at DESC`,
    [staleHours],
  );

  return rows;
}
