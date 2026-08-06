import { DateTime } from 'luxon';

export const ISRAEL_TIMEZONE = 'Asia/Jerusalem';

export type WeddingMessageTemplateName =
  | 'wedding_confirmation'
  | 'wedding_reminder'
  | 'wedding_day_before'
  | 'wedding_post_thanks';

export interface WeddingScheduleOffsets {
  invitationDaysBefore: number;
  reminderDaysBefore: number;
  dayBeforeOffsetDays: number;
}

export interface WeddingScheduleComputedDates {
  invitationSendAt: string;
  reminderSendAt: string;
  dayBeforeSendAt: string;
  postThanksSendAt: string;
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

function avoidSaturday(candidate: DateTime): DateTime {
  // Luxon weekday: 1=Mon ... 6=Sat ... 7=Sun
  // If computed send date falls on Shabbat (Saturday), move it to Friday noon instead.
  if (candidate.weekday !== 6) {
    return candidate;
  }

  return candidate.minus({ days: 1 }).set({ hour: 12, minute: 0, second: 0, millisecond: 0 });
}

export function computeInvitationSendAt(
  weddingDate: string | Date,
  invitationDaysBefore: number,
): DateTime {
  const base = normalizeToIsraelNoon(weddingDate).minus({ days: invitationDaysBefore });
  return avoidSaturday(base);
}

export function computeReminderSendAt(
  weddingDate: string | Date,
  reminderDaysBefore: number,
): DateTime {
  const base = normalizeToIsraelNoon(weddingDate).minus({ days: reminderDaysBefore });
  return avoidSaturday(base);
}

export function computeDayBeforeSendAt(
  weddingDate: string | Date,
  dayBeforeOffsetDays: number,
): DateTime {
  const base = normalizeToIsraelNoon(weddingDate).minus({ days: dayBeforeOffsetDays });
  return avoidSaturday(base);
}

export function computePostThanksSendAt(weddingDate: string | Date): DateTime {
  const base = normalizeToIsraelNoon(weddingDate).plus({ days: 1 });
  return avoidSaturday(base);
}

export function computeWeddingMessageScheduleDates(
  weddingDate: string | Date,
  offsets: WeddingScheduleOffsets,
): WeddingScheduleComputedDates {
  const invitation = computeInvitationSendAt(weddingDate, offsets.invitationDaysBefore);
  const reminder = computeReminderSendAt(weddingDate, offsets.reminderDaysBefore);
  const dayBefore = computeDayBeforeSendAt(weddingDate, offsets.dayBeforeOffsetDays);
  const postThanks = computePostThanksSendAt(weddingDate);

  return {
    invitationSendAt: invitation.toISO() ?? invitation.toString(),
    reminderSendAt: reminder.toISO() ?? reminder.toString(),
    dayBeforeSendAt: dayBefore.toISO() ?? dayBefore.toString(),
    postThanksSendAt: postThanks.toISO() ?? postThanks.toString(),
  };
}

export function getIsraelNow(): DateTime {
  return DateTime.now().setZone(ISRAEL_TIMEZONE);
}

export function toIsraelDate(dateValue: string | Date): DateTime {
  return normalizeToIsraelNoon(dateValue);
}
