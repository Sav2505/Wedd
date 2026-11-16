import { DateTime } from 'luxon';
import { createError } from '../middleware/errorHandler';
import { ISRAEL_TIMEZONE, type WeddingMessageTemplateName } from './scheduling.util';

export interface GroupScheduleAssignment {
  groupId: string | null;
  excluded: boolean;
  localDateTime: string | null;
}

export interface GroupScheduleAudience {
  groupId: string | null;
  eligibleCount: number;
}

export interface ValidatedGroupScheduleAssignment extends GroupScheduleAssignment {
  scheduledAt: string | null;
}

export function validateGroupMessageSchedule(
  templateName: WeddingMessageTemplateName,
  weddingDate: string,
  assignments: GroupScheduleAssignment[],
  audience: GroupScheduleAudience[],
  now: DateTime = DateTime.now(),
  limit = 250,
): ValidatedGroupScheduleAssignment[] {
  const weddingDay = DateTime.fromISO(weddingDate, { zone: ISRAEL_TIMEZONE }).startOf('day');
  if (!weddingDay.isValid || !Array.isArray(assignments) || !Array.isArray(audience)) {
    throw createError('פרטי התזמון אינם תקינים', 400);
  }

  const groups = new Map(audience.map((group) => [group.groupId, group.eligibleCount]));
  const assigned = new Set<string | null>();
  const validated = assignments.map((assignment) => {
    if (!assignment || typeof assignment.excluded !== 'boolean' ||
        (assignment.groupId !== null && typeof assignment.groupId !== 'string') ||
        !groups.has(assignment.groupId) || assigned.has(assignment.groupId)) {
      throw createError('הקבוצות שנבחרו אינן תקינות או משובצות יותר מפעם אחת', 400);
    }
    assigned.add(assignment.groupId);

    if (assignment.excluded) {
      if (assignment.localDateTime !== null) {
        throw createError('אין לבחור מועד לקבוצה שהוחרגה', 400);
      }
      return { ...assignment, scheduledAt: null };
    }
    if ((groups.get(assignment.groupId) ?? 0) > limit) {
      throw createError('הקבוצה גדולה ממכסת ההודעות ויש לחלק אותה לקבוצות קטנות יותר', 400);
    }
    if (typeof assignment.localDateTime !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(assignment.localDateTime)) {
      throw createError('יש לבחור תאריך ושעה תקינים', 400);
    }
    const date = DateTime.fromFormat(assignment.localDateTime, "yyyy-MM-dd'T'HH:mm", {
      zone: ISRAEL_TIMEZONE,
    });
    if (!date.isValid || date.toFormat("yyyy-MM-dd'T'HH:mm") !== assignment.localDateTime ||
        date.getPossibleOffsets().length !== 1) {
      throw createError('השעה שנבחרה אינה קיימת או אינה חד-משמעית באזור הזמן של ישראל', 400);
    }
    if (date.weekday === 6) throw createError('לא ניתן לתזמן שליחה בשבת', 400);
    if (date.toMillis() <= now.toMillis()) throw createError('מועד השליחה חייב להיות בעתיד', 400);
    const sendDay = date.startOf('day');
    const invalidEventRange = templateName === 'wedding_post_thanks'
      ? sendDay <= weddingDay || sendDay > weddingDay.plus({ days: 7 })
      : sendDay > weddingDay;
    if (invalidEventRange) {
      throw createError('מועד השליחה אינו מתאים לתאריך החתונה', 400);
    }
    return { ...assignment, scheduledAt: date.toUTC().toISO() };
  });

  if (assigned.size !== groups.size) {
    throw createError('יש לשבץ או להחריג את כל קבוצות האורחים', 400);
  }
  return validated;
}