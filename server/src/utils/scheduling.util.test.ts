import test from 'node:test';
import assert from 'node:assert/strict';
import { DateTime } from 'luxon';
import {
  ISRAEL_TIMEZONE,
  computeDayBeforeSendAt,
  computeInvitationSendAt,
  computePostThanksSendAt,
  computeReminderSendAt,
  computeWhenLabel,
  getDaysUntilWedding,
  computeWeddingMessageScheduleDates,
} from './scheduling.util';

function toDate(dt: DateTime): string {
  return dt.setZone(ISRAEL_TIMEZONE).toFormat('yyyy-LL-dd HH:mm cccc');
}

test('invitation: saturday send date moves to friday noon', () => {
  const actual = computeInvitationSendAt('2026-08-31', 30).setZone(ISRAEL_TIMEZONE);
  assert.equal(toDate(actual), '2026-07-31 12:00 Friday');
});

test('reminder: saturday send date moves to friday noon', () => {
  const actual = computeReminderSendAt('2026-08-29', 14).setZone(ISRAEL_TIMEZONE);
  assert.equal(toDate(actual), '2026-08-14 12:00 Friday');
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

test('day-before label follows Israel calendar days at send time, including midnight and DST', () => {
  const beforeWeddingDay = DateTime.fromISO('2027-06-13T23:59', { zone: ISRAEL_TIMEZONE });
  const onWeddingDay = DateTime.fromISO('2027-06-14T00:01', { zone: ISRAEL_TIMEZONE });
  assert.equal(getDaysUntilWedding('2027-06-14', beforeWeddingDay), 1);
  assert.equal(computeWhenLabel(getDaysUntilWedding('2027-06-14', beforeWeddingDay)), 'מחר');
  assert.equal(getDaysUntilWedding('2027-06-14', onWeddingDay), 0);
  assert.equal(computeWhenLabel(getDaysUntilWedding('2027-06-14', onWeddingDay)), 'היום');

  const acrossDst = DateTime.fromISO('2027-03-25T23:59', { zone: ISRAEL_TIMEZONE });
  assert.equal(getDaysUntilWedding('2027-03-28', acrossDst), 3);
  assert.equal(computeWhenLabel(getDaysUntilWedding('2027-03-28', acrossDst)), 'בעוד שלושה ימים');
});

test('day-before label formats the supported day counts and larger offsets', () => {
  assert.equal(computeWhenLabel(2), 'מחרתיים');
  assert.equal(computeWhenLabel(7), 'בעוד שבעה ימים');
  assert.equal(computeWhenLabel(8), 'בעוד 8 ימים');
});
