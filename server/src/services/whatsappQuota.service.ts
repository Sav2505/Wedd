import type { PoolClient } from 'pg';
import { pool } from '../db/pool';

const QUOTA_LOCK_KEY = 748922;
const DEFAULT_LIMIT = 250;

export class WhatsAppQuotaError extends Error {
  statusCode = 429;
  constructor(message: string) {
    super(message);
    this.name = 'WhatsAppQuotaError';
  }
}

function quotaLimit(): number {
  const configured = Number(process.env.WHATSAPP_DAILY_MESSAGE_LIMIT ?? DEFAULT_LIMIT);
  if (!Number.isSafeInteger(configured) || configured < 1 || configured > DEFAULT_LIMIT) {
    throw new WhatsAppQuotaError('מגבלת הודעות WhatsApp אינה מוגדרת כראוי');
  }
  return configured;
}

export async function reserveWhatsAppQuota(templateName: string): Promise<string> {
  const reservations = await reserveWhatsAppQuotaBatch(templateName, 1);
  return reservations[0];
}

export async function reserveWhatsAppQuotaBatch(templateName: string, count: number): Promise<string[]> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const reservations = await reserveWhatsAppQuotaBatchInTransaction(client, templateName, count);
    await client.query('COMMIT');
    return reservations;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function completeWhatsAppQuotaReservation(
  reservationId: string,
  status: 'accepted' | 'unknown' | 'rejected',
  messageId?: string,
  client: Pick<PoolClient, 'query'> = pool,
): Promise<void> {
  const result = await client.query(
    `UPDATE whatsapp_quota_reservations
     SET status = $2, whatsapp_message_id = $3, completed_at = NOW()
     WHERE id = $1 AND status = 'reserved'`,
    [reservationId, status, messageId ?? null],
  );
  if (result.rowCount !== 1) {
    throw new Error('WhatsApp quota reservation could not be completed');
  }
}

export async function reserveWhatsAppQuotaBatchInTransaction(
  client: Pick<PoolClient, 'query'>,
  templateName: string,
  count: number,
): Promise<string[]> {
  const limit = quotaLimit();
  if (!Number.isSafeInteger(count) || count < 0 || count > limit) {
    throw new WhatsAppQuotaError('גודל הקבוצה חורג ממכסת הודעות WhatsApp');
  }
  if (count === 0) return [];
  await client.query('SELECT pg_advisory_xact_lock($1)', [QUOTA_LOCK_KEY]);
  let settings;
  try {
    settings = await client.query<{ ready: boolean }>(
      `SELECT send_not_before <= NOW() AS ready FROM whatsapp_quota_settings
       WHERE id = TRUE AND EXISTS (
         SELECT 1 FROM whatsapp_quota_cutover_markers WHERE name = 'require_legacy_cutover'
       )`,
    );
  } catch (error) {
    if ((error as { code?: string }).code === '42P01') {
      throw new WhatsAppQuotaError('תשתית מכסת WhatsApp עדיין אינה מוכנה');
    }
    throw error;
  }
  if (!settings.rows[0]?.ready) {
    throw new WhatsAppQuotaError('שליחת WhatsApp מושהית לצורך מעבר בטוח למנגנון המכסה');
  }
  const usage = await client.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM whatsapp_quota_reservations
      WHERE (status = 'reserved' AND created_at > NOW() - INTERVAL '24 hours')
        OR (status = 'unknown' AND completed_at > NOW() - INTERVAL '24 hours')
        OR (status = 'accepted' AND completed_at > NOW() - INTERVAL '24 hours')`,
  );
  if (Number(usage.rows[0].count) + count > limit) {
    throw new WhatsAppQuotaError('מכסת הודעות WhatsApp ב-24 השעות האחרונות מלאה');
  }
  const reservations = await client.query<{ id: string }>(
    `INSERT INTO whatsapp_quota_reservations (template_name)
     SELECT $1 FROM generate_series(1, $2::integer) RETURNING id`,
    [templateName, count],
  );
  return reservations.rows.map((row) => row.id);
}