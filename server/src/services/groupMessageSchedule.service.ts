import type { PoolClient } from 'pg';
import { DateTime } from 'luxon';
import { pool } from '../db/pool';
import { createError } from '../middleware/errorHandler';
import { validateGroupMessageSchedule, type GroupScheduleAssignment } from '../utils/groupMessageSchedule.util';
import type { WeddingMessageTemplateName } from '../utils/scheduling.util';

export function isGroupMessageSchedulerEnabled(): boolean {
  return String(process.env.WHATSAPP_GROUP_SCHEDULER_ENABLED ?? 'false').toLowerCase() === 'true' &&
    String(process.env.IS_PROD ?? 'false').toLowerCase() === 'true' &&
    String(process.env.WHATSAPP_TEST_ONLY ?? 'false').toLowerCase() !== 'true';
}

export function getGroupMessageSchedulerDisabledReasons(
  schema: { delivery_ready: boolean; legacy_pauses_ready: boolean; cutover_ready: boolean },
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const reasons: string[] = [];
  if (String(env.WHATSAPP_GROUP_SCHEDULER_ENABLED ?? 'false').toLowerCase() !== 'true') {
    reasons.push('WHATSAPP_GROUP_SCHEDULER_ENABLED חייב להיות true');
  }
  if (String(env.IS_PROD ?? 'false').toLowerCase() !== 'true') {
    reasons.push('IS_PROD חייב להיות true בשרת הייצור');
  }
  if (String(env.WHATSAPP_TEST_ONLY ?? 'false').toLowerCase() === 'true') {
    reasons.push('יש לכבות WHATSAPP_TEST_ONLY');
  }
  if (!schema.delivery_ready) reasons.push('חסרה מיגרציה 027: טבלת מעקב נמענים');
  if (!schema.legacy_pauses_ready) reasons.push('חסרה מיגרציה 026: טבלת השהיות legacy');
  if (!schema.cutover_ready) reasons.push('חסרה מיגרציה 028: סימון מעבר מכסה');
  return reasons;
}

const templates: WeddingMessageTemplateName[] = [
  'wedding_confirmation', 'wedding_reminder', 'wedding_day_before', 'wedding_post_thanks',
];

interface AudienceRow {
  group_id: string | null;
  name: string;
  total: number;
  pending: number;
  coming: number;
}

async function assertWeddingAccess(client: Pick<PoolClient, 'query'>, coupleId: string, weddingId: number): Promise<string> {
  const result = await client.query<{ wedding_date: string }>(
    `SELECT wi.wedding_date::text AS wedding_date
     FROM wedding_info wi JOIN guests couple ON couple.wedding_id = wi.id
     WHERE wi.id = $1 AND couple.id = $2 AND couple.role = 'couple'`,
    [weddingId, coupleId],
  );
  if (!result.rows[0]) throw createError('אין הרשאה לחתונה המבוקשת', 403);
  return result.rows[0].wedding_date;
}

async function getAudience(client: Pick<PoolClient, 'query'>, weddingId: number): Promise<AudienceRow[]> {
  const result = await client.query<AudienceRow>(
    `SELECT gg.id AS group_id, gg.name,
       COUNT(g.id) FILTER (WHERE NULLIF(BTRIM(g.phone), '') IS NOT NULL)::int AS total,
       COUNT(g.id) FILTER (WHERE NULLIF(BTRIM(g.phone), '') IS NOT NULL AND g.rsvp_status = 'PENDING')::int AS pending,
       COUNT(g.id) FILTER (WHERE NULLIF(BTRIM(g.phone), '') IS NOT NULL AND g.rsvp_status = 'COMING')::int AS coming
     FROM guest_groups gg LEFT JOIN guests g
       ON g.guest_group_id = gg.id AND g.wedding_id = gg.wedding_id AND g.role = 'guest'
     WHERE gg.wedding_id = $1 GROUP BY gg.id, gg.name
     UNION ALL
     SELECT NULL::uuid, 'ללא קבוצה',
       COUNT(*) FILTER (WHERE NULLIF(BTRIM(g.phone), '') IS NOT NULL)::int,
       COUNT(*) FILTER (WHERE NULLIF(BTRIM(g.phone), '') IS NOT NULL AND g.rsvp_status = 'PENDING')::int,
       COUNT(*) FILTER (WHERE NULLIF(BTRIM(g.phone), '') IS NOT NULL AND g.rsvp_status = 'COMING')::int
     FROM guests g WHERE g.wedding_id = $1 AND g.role = 'guest' AND g.guest_group_id IS NULL`,
    [weddingId],
  );
  return result.rows;
}

async function getSchemaReadiness(client: Pick<PoolClient, 'query'>): Promise<{
  delivery_ready: boolean;
  legacy_pauses_ready: boolean;
  cutover_ready: boolean;
}> {
  const result = await client.query<{
    delivery_ready: boolean;
    legacy_pauses_ready: boolean;
    cutover_ready: boolean;
  }>(
    `SELECT to_regclass('wedding_whatsapp_group_deliveries') IS NOT NULL AS delivery_ready,
      to_regclass('wedding_whatsapp_legacy_pauses') IS NOT NULL AS legacy_pauses_ready,
      to_regclass('whatsapp_quota_cutover_markers') IS NOT NULL AS cutover_ready`,
  );
  return result.rows[0] ?? { delivery_ready: false, legacy_pauses_ready: false, cutover_ready: false };
}

export async function getGroupMessageSchedule(coupleId: string, weddingId: number) {
  await assertWeddingAccess(pool, coupleId, weddingId);
  const schema = await getSchemaReadiness(pool);
  const [groups, schedules, invitationStatus] = await Promise.all([
    getAudience(pool, weddingId),
    pool.query(
      schema.delivery_ready ? `SELECT s.id, s.template_name, s.guest_group_id, s.scheduled_at, s.status, s.status_detail,
         COUNT(d.id) FILTER (WHERE d.status = 'sent')::int AS sent_count,
         COUNT(d.id) FILTER (WHERE d.status = 'skipped')::int AS skipped_count,
         COUNT(d.id) FILTER (WHERE d.status IN ('failed', 'unknown'))::int AS problem_count
       FROM wedding_whatsapp_group_schedule s
       LEFT JOIN wedding_whatsapp_group_deliveries d ON d.schedule_id = s.id
       WHERE s.wedding_id = $1 GROUP BY s.id ORDER BY s.template_name, s.id` :
      `SELECT id, template_name, guest_group_id, scheduled_at, status, status_detail,
         0::int AS sent_count, 0::int AS skipped_count, 0::int AS problem_count
       FROM wedding_whatsapp_group_schedule WHERE wedding_id = $1 ORDER BY template_name, id`,
      [weddingId],
    ),
    pool.query<{ sent: boolean }>(
      `SELECT s.invitation_locked_at IS NOT NULL OR EXISTS (
         SELECT 1 FROM wedding_message_log l
         WHERE l.wedding_id = s.wedding_id
           AND l.template_name = 'wedding_confirmation'
           AND l.status <> 'failed'
       ) AS sent
       FROM wedding_message_schedule s WHERE s.wedding_id = $1`,
      [weddingId],
    ),
  ]);
  return {
    groups,
    schedules: schedules.rows,
    invitation_locked: Boolean(invitationStatus.rows[0]?.sent),
    enabled: getGroupMessageSchedulerDisabledReasons(schema).length === 0,
    disabled_reasons: getGroupMessageSchedulerDisabledReasons(schema),
  };
}

export async function saveGroupMessageSchedule(
  coupleId: string,
  weddingId: number,
  templateName: string,
  assignments: GroupScheduleAssignment[],
): Promise<void> {
  if (!templates.includes(templateName as WeddingMessageTemplateName)) throw createError('סוג ההודעה אינו תקין', 400);
  const template = templateName as WeddingMessageTemplateName;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [748921]);
    const weddingDate = await assertWeddingAccess(client, coupleId, weddingId);
    const schema = await getSchemaReadiness(client);
    const disabledReasons = getGroupMessageSchedulerDisabledReasons(schema);
    if (disabledReasons.length > 0) {
      throw createError(`תזמון לפי קבוצות לא זמין: ${disabledReasons.join('; ')}`, 503);
    }
    const locked = await client.query<{ locked: boolean }>(
      `SELECT CASE $2
         WHEN 'wedding_confirmation' THEN invitation_locked_at IS NOT NULL OR EXISTS (
           SELECT 1 FROM wedding_message_log l
           WHERE l.wedding_id = wedding_message_schedule.wedding_id
             AND l.template_name = 'wedding_confirmation'
             AND l.status <> 'failed'
         )
         WHEN 'wedding_reminder' THEN reminder_locked_at IS NOT NULL
         WHEN 'wedding_day_before' THEN day_before_locked_at IS NOT NULL
         ELSE post_thanks_locked_at IS NOT NULL END AS locked
       FROM wedding_message_schedule WHERE wedding_id = $1 FOR UPDATE`,
      [weddingId, template],
    );
    if (locked.rows[0]?.locked) throw createError('ההודעה כבר נשלחה ולא ניתנת לתזמון מחדש', 409);
    const current = await client.query<{ status: string; guest_group_id: string | null; scheduled_at: Date | null }>(
      `SELECT status, guest_group_id, scheduled_at FROM wedding_whatsapp_group_schedule
       WHERE wedding_id = $1 AND template_name = $2 FOR UPDATE`,
      [weddingId, template],
    );
    if (!Array.isArray(assignments)) throw createError('פרטי התזמון אינם תקינים', 400);
    const lockedGroups = current.rows.filter((row) => ['processing', 'completed', 'paused_error'].includes(row.status));
    for (const row of lockedGroups) {
      const matching = assignments.filter((assignment) => assignment?.groupId === row.guest_group_id);
      const localTime = row.scheduled_at && DateTime.fromJSDate(new Date(row.scheduled_at)).setZone('Asia/Jerusalem').toFormat("yyyy-MM-dd'T'HH:mm");
      if (matching.length !== 1 || matching[0].excluded || matching[0].localDateTime !== localTime) {
        throw createError('לא ניתן לשנות קבוצה שכבר החלה להישלח', 409);
      }
    }
    const groups = await getAudience(client, weddingId);
    const isLocked = (groupId: string | null) => lockedGroups.some((row) => row.guest_group_id === groupId);
    const validated = validateGroupMessageSchedule(template, weddingDate, assignments.filter((assignment) => !isLocked(assignment?.groupId)), groups.filter((group) => !isLocked(group.group_id)).map((group) => ({
      groupId: group.group_id,
      eligibleCount: template === 'wedding_confirmation' ? group.total : template === 'wedding_reminder' ? group.pending : group.coming,
    })));
    await client.query(
      `DELETE FROM wedding_whatsapp_group_schedule WHERE wedding_id = $1 AND template_name = $2
      AND status IN ('scheduled', 'excluded', 'paused_quota', 'paused_schedule')`,
      [weddingId, template],
    );
    for (const assignment of validated) {
      await client.query(
        `INSERT INTO wedding_whatsapp_group_schedule
         (wedding_id, template_name, guest_group_id, scheduled_at, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [weddingId, template, assignment.groupId, assignment.scheduledAt, assignment.excluded ? 'excluded' : 'scheduled'],
      );
    }
    await client.query('DELETE FROM wedding_whatsapp_legacy_pauses WHERE wedding_id = $1 AND template_name = $2', [weddingId, template]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}