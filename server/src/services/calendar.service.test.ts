import test from 'node:test';
import assert from 'node:assert/strict';
import { WeddingInfo } from '../types';
import { createWeddingCalendar } from './calendar.service';

const wedding = {
  id: 42,
  bride_name: 'שירה',
  groom_name: 'דן',
  wedding_date: '2026-10-15',
  wedding_time: '19:30:00',
  venue_name: 'גן, האירועים',
  venue_address: 'רחוב; השלום',
} as WeddingInfo;

test('creates a stable event at the Israel-local wedding date and time', () => {
  const calendar = createWeddingCalendar(wedding, new Date('2026-01-02T03:04:05Z'));

  assert.match(calendar, /UID:wedding-42@wedflow/);
  assert.match(calendar, /DTSTAMP:20260102T030405Z/);
  assert.match(calendar, /DTSTART:20261015T163000Z/);
  assert.match(calendar, /DTEND:20261015T203000Z/);
  assert.match(calendar, /SUMMARY:החתונה של דן ושירה/);
  assert.match(calendar, /LOCATION:גן\\, האירועים — רחוב\\; השלום/);
  assert.match(calendar, /DESCRIPTION:פרטי האירוע והזמנה דרך WedFlow/);
  assert.ok(calendar.endsWith('\r\n'));
});

test('applies the Israel winter offset without changing the local event time', () => {
  const calendar = createWeddingCalendar({
    ...wedding,
    wedding_date: '2026-01-15',
  }, new Date('2026-01-02T03:04:05Z'));

  assert.match(calendar, /DTSTART:20260115T173000Z/);
});

test('escapes backslashes and line breaks in calendar text', () => {
  const calendar = createWeddingCalendar({
    ...wedding,
    groom_name: 'דן\\כהן\nושירה',
  }, new Date('2026-01-02T03:04:05Z'));

  assert.ok(calendar.includes('SUMMARY:החתונה של דן\\\\כהן\\nושירה ושירה'));
});

test('rejects a missing reception time instead of inventing one', () => {
  assert.throws(
    () => createWeddingCalendar({ ...wedding, wedding_time: null as unknown as string }),
    /תאריך או שעת קבלת הפנים אינם תקינים/,
  );
});

test('rejects a local time that does not exist during Israel DST transition', () => {
  assert.throws(
    () => createWeddingCalendar({
      ...wedding,
      wedding_date: '2026-03-27',
      wedding_time: '02:30:00',
    }),
    /תאריך או שעת קבלת הפנים אינם תקינים/,
  );
});