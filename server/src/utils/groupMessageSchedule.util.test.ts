import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DateTime } from 'luxon';
import { validateGroupMessageSchedule, type GroupScheduleAssignment } from './groupMessageSchedule.util';

const now = DateTime.fromISO('2027-06-01T10:00:00', { zone: 'Asia/Jerusalem' });
const audience = [{ groupId: 'friends', eligibleCount: 250 }, { groupId: null, eligibleCount: 1 }];
const assignments: GroupScheduleAssignment[] = [
  { groupId: 'friends', excluded: false, localDateTime: '2027-06-10T12:30' },
  { groupId: null, excluded: true, localDateTime: null },
];

test('validates all groups and converts Israel local time to UTC', () => {
  const result = validateGroupMessageSchedule('wedding_reminder', '2027-06-14', assignments, audience, now);
  assert.equal(result[0].scheduledAt, '2027-06-10T09:30:00.000Z');
  assert.equal(result[1].scheduledAt, null);
});

test('rejects missing, duplicate, foreign and oversized groups', () => {
  const validate = (items: GroupScheduleAssignment[], groups = audience) =>
    validateGroupMessageSchedule('wedding_reminder', '2027-06-14', items, groups, now);
  assert.throws(() => validate(assignments.slice(0, 1)), /לשבץ או להחריג/);
  assert.throws(() => validate([...assignments, assignments[0]]), /יותר מפעם אחת/);
  assert.throws(() => validate([...assignments, { groupId: 'foreign', excluded: true, localDateTime: null }]), /אינן תקינות/);
  assert.throws(() => validate(assignments, [{ groupId: 'friends', eligibleCount: 251 }, audience[1]]), /גדולה ממכסת/);
});

test('rejects saturday, past, ambiguous and nonexistent local times', () => {
  const validate = (localDateTime: string, current = now) => validateGroupMessageSchedule(
    'wedding_reminder', '2027-12-01', [{ groupId: null, excluded: false, localDateTime }],
    [{ groupId: null, eligibleCount: 1 }], current,
  );
  assert.throws(() => validate('2027-06-12T12:00'), /בשבת/);
  assert.throws(() => validate('2027-05-10T12:00'), /בעתיד/);
  assert.throws(() => validate('2027-03-26T02:30', DateTime.fromISO('2027-01-01')), /אינה קיימת/);
  assert.throws(() => validate('2027-10-31T01:30'), /אינה קיימת/);
});

test('enforces event date boundaries for reminders and thank-you messages', () => {
  const single = [{ groupId: null, eligibleCount: 1 }];
  const date = (localDateTime: string) => [{ groupId: null, excluded: false, localDateTime }];
  assert.throws(() => validateGroupMessageSchedule('wedding_day_before', '2027-06-14', date('2027-06-15T12:00'), single, now), /תאריך החתונה/);
  assert.throws(() => validateGroupMessageSchedule('wedding_post_thanks', '2027-06-14', date('2027-06-14T12:00'), single, now), /תאריך החתונה/);
  assert.equal(validateGroupMessageSchedule('wedding_post_thanks', '2027-06-14', date('2027-06-15T12:00'), single, now)[0].scheduledAt, '2027-06-15T09:00:00.000Z');
  assert.equal(validateGroupMessageSchedule('wedding_post_thanks', '2027-06-14', date('2027-06-21T23:59'), single, now)[0].scheduledAt, '2027-06-21T20:59:00.000Z');
  assert.throws(() => validateGroupMessageSchedule('wedding_post_thanks', '2027-06-14', date('2027-06-22T00:00'), single, now), /תאריך החתונה/);
});