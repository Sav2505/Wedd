import test from 'node:test';
import assert from 'node:assert/strict';
import { DateTime } from 'luxon';
import {
  ISRAEL_TIMEZONE,
  computeDayBeforeSendAt,
  computeInvitationSendAt,
  computePostThanksSendAt,
  computeReminderSendAt,
  computeWeddingMessageScheduleDates,
} from './scheduling.util';

function toDate(dt: DateTime): string {
  return dt.setZone(ISRAEL_TIMEZONE).toFormat('yyyy-LL-dd HH:mm cccc');
}

test('invitation: saturday send date moves to sunday noon', () => {
  // 2026-08-31 (Mon) - 30 days = 2026-08-01 (Sat) -> 2026-08-02 (Sun) at 12:00
  const actual = computeInvitationSendAt('2026-08-31', 30).setZone(ISRAEL_TIMEZONE);
  assert.equal(toDate(actual), '2026-08-02 12:00 Sunday');
});

test('reminder: saturday send date moves to sunday noon', () => {
  // 2026-08-29 (Sat) - 14 days = 2026-08-15 (Sat) -> 2026-08-16 (Sun) at 12:00
  const actual = computeReminderSendAt('2026-08-29', 14).setZone(ISRAEL_TIMEZONE);
  assert.equal(toDate(actual), '2026-08-16 12:00 Sunday');
});

test('day-before: sunday wedding moves from saturday to friday noon', () => {
  // 2026-08-09 is Sunday
  const actual = computeDayBeforeSendAt('2026-08-09', 1).setZone(ISRAEL_TIMEZONE);
  assert.equal(toDate(actual), '2026-08-07 12:00 Friday');
});

test('day-before: friday wedding remains thursday noon', () => {
  const actual = computeDayBeforeSendAt('2026-08-07', 1).setZone(ISRAEL_TIMEZONE);
  assert.equal(toDate(actual), '2026-08-06 12:00 Thursday');
});

test('post-thanks: friday wedding moves saturday send to sunday noon', () => {
  const actual = computePostThanksSendAt('2026-08-07').setZone(ISRAEL_TIMEZONE);
  assert.equal(toDate(actual), '2026-08-09 12:00 Sunday');
});

test('post-thanks: regular day sends next day at noon', () => {
  const actual = computePostThanksSendAt('2026-08-05').setZone(ISRAEL_TIMEZONE);
  assert.equal(toDate(actual), '2026-08-06 12:00 Thursday');
});

test('all computed dates are fixed at 12:00 in Israel timezone across DST periods', () => {
  const dates = computeWeddingMessageScheduleDates('2026-03-31', {
    invitationDaysBefore: 0,
    reminderDaysBefore: 0,
    dayBeforeOffsetDays: 1,
  });

  const invitation = DateTime.fromISO(dates.invitationSendAt).setZone(ISRAEL_TIMEZONE);
  const reminder = DateTime.fromISO(dates.reminderSendAt).setZone(ISRAEL_TIMEZONE);
  const dayBefore = DateTime.fromISO(dates.dayBeforeSendAt).setZone(ISRAEL_TIMEZONE);
  const postThanks = DateTime.fromISO(dates.postThanksSendAt).setZone(ISRAEL_TIMEZONE);

  assert.equal(invitation.zoneName, ISRAEL_TIMEZONE);
  assert.equal(reminder.zoneName, ISRAEL_TIMEZONE);
  assert.equal(dayBefore.zoneName, ISRAEL_TIMEZONE);
  assert.equal(postThanks.zoneName, ISRAEL_TIMEZONE);

  assert.equal(invitation.hour, 12);
  assert.equal(reminder.hour, 12);
  assert.equal(dayBefore.hour, 12);
  assert.equal(postThanks.hour, 12);
});
