import { DateTime } from 'luxon';

export const ISRAEL_TIMEZONE = 'Asia/Jerusalem';

export type WeddingMessageTemplateName =
  | 'wedding_invitation'
  | 'wedding_reminder'
  | 'wedding_day_before';

export interface WeddingScheduleOffsets {
  invitationDaysBefore: number;
  reminderDaysBefore: number;
  dayBeforeOffsetDays: number;
}

export interface WeddingScheduleComputedDates {
  invitationSendAt: string;
  reminderSendAt: string;
  dayBeforeSendAt: string;
}

function normalizeToIsraelNoon(dateValue: string | Date): DateTime {
  const dt = typeof dateValue === 'string'
    ? DateTime.fromISO(dateValue, { zone: ISRAEL_TIMEZONE })
    : DateTime.fromJSDate(dateValue, { zone: ISRAEL_TIMEZONE });

  if (!dt.isValid) {
    throw new Error('Invalid wedding date input for scheduling');
  }

  return dt.set({ hour: 12, minute: 0, second: 0, millisecond: 0 });
}

function deferSaturdayToSundayNoon(candidate: DateTime): DateTime {
  if (candidate.weekday !== 6) {
    return candidate;
  }

  return candidate.plus({ days: 1 }).set({ hour: 12, minute: 0, second: 0, millisecond: 0 });
}

export function computeInvitationSendAt(
  weddingDate: string | Date,
  invitationDaysBefore: number,
): DateTime {
  const base = normalizeToIsraelNoon(weddingDate).minus({ days: invitationDaysBefore });
  return deferSaturdayToSundayNoon(base);
}

export function computeReminderSendAt(
  weddingDate: string | Date,
  reminderDaysBefore: number,
): DateTime {
  const base = normalizeToIsraelNoon(weddingDate).minus({ days: reminderDaysBefore });
  return deferSaturdayToSundayNoon(base);
}

export function computeDayBeforeSendAt(
  weddingDate: string | Date,
  dayBeforeOffsetDays: number,
): DateTime {
  const wedding = normalizeToIsraelNoon(weddingDate);
  const base = wedding.minus({ days: dayBeforeOffsetDays });

  // If wedding day is Sunday and the computed send day is Saturday, move to Friday noon.
  if (wedding.weekday === 7 && base.weekday === 6) {
    return base.minus({ days: 1 }).set({ hour: 12, minute: 0, second: 0, millisecond: 0 });
  }

  return base;
}

export function computeWeddingMessageScheduleDates(
  weddingDate: string | Date,
  offsets: WeddingScheduleOffsets,
): WeddingScheduleComputedDates {
  const invitation = computeInvitationSendAt(weddingDate, offsets.invitationDaysBefore);
  const reminder = computeReminderSendAt(weddingDate, offsets.reminderDaysBefore);
  const dayBefore = computeDayBeforeSendAt(weddingDate, offsets.dayBeforeOffsetDays);

  return {
    invitationSendAt: invitation.toISO() ?? invitation.toString(),
    reminderSendAt: reminder.toISO() ?? reminder.toString(),
    dayBeforeSendAt: dayBefore.toISO() ?? dayBefore.toString(),
  };
}

export function getIsraelNow(): DateTime {
  return DateTime.now().setZone(ISRAEL_TIMEZONE);
}

export function toIsraelDate(dateValue: string | Date): DateTime {
  return normalizeToIsraelNoon(dateValue);
}
