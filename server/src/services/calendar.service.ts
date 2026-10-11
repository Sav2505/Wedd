import { DateTime } from 'luxon';
import { createError } from '../middleware/errorHandler';
import { WeddingInfo } from '../types';
import { ISRAEL_TIMEZONE } from '../utils/scheduling.util';

// wedding_info has no end-time column, so calendar events default to 5.5 hours.
const DEFAULT_EVENT_DURATION_HOURS = 5.5;
const DEFAULT_REMINDER_DAYS = 7;

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function foldIcsLine(line: string): string[] {
  const folded: string[] = [];
  let segment = '';
  let segmentBytes = 0;

  for (const character of line) {
    const characterBytes = Buffer.byteLength(character, 'utf8');
    if (segmentBytes + characterBytes > 75) {
      folded.push(segment);
      segment = ' ';
      segmentBytes = 1;
    }
    segment += character;
    segmentBytes += characterBytes;
  }

  folded.push(segment);
  return folded;
}

function toIcsUtc(dateTime: DateTime): string {
  return dateTime.toUTC().toFormat("yyyyLLdd'T'HHmmss'Z'");
}

export function createWeddingCalendar(
  wedding: WeddingInfo,
  createdAt = new Date(),
): string {
  const date = String(wedding.wedding_date).slice(0, 10);
  const time = wedding.wedding_time?.slice(0, 5);
  const start = DateTime.fromISO(`${date}T${time ?? ''}`, { zone: ISRAEL_TIMEZONE });

  if (
    !start.isValid ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^\d{2}:\d{2}$/.test(time ?? '') ||
    start.toFormat('yyyy-LL-dd HH:mm') !== `${date} ${time}`
  ) {
    throw createError('תאריך או שעת קבלת הפנים אינם תקינים', 422);
  }

  const end = start.plus({ hours: DEFAULT_EVENT_DURATION_HOURS });
  const groom = wedding.groom_name?.trim();
  const bride = wedding.bride_name?.trim();
  const summary = groom && bride
    ? `💍 החתונה של ${bride} ו${groom} 💍`
    : groom || bride
      ? `💍 החתונה של ${bride || groom} 💍`
      : '💍 החתונה 💍';
  const location = [wedding.venue_name, wedding.venue_address]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(' — ');
  const stamp = DateTime.fromJSDate(createdAt, { zone: 'utc' });

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//WedFlow//Wedding Calendar//HE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:wedding-${wedding.id}@wedflow`,
    `DTSTAMP:${toIcsUtc(stamp)}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    ...(location ? [`LOCATION:${escapeIcsText(location)}`] : []),
    `DESCRIPTION:${escapeIcsText('פרטי האירוע והזמנה דרך WedFlow')}`,
    'BEGIN:VALARM',
    `TRIGGER:-P${DEFAULT_REMINDER_DAYS}D`,
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText('תזכורת: החתונה בעוד שבוע')}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return `${lines.flatMap(foldIcsLine).join('\r\n')}\r\n`;
}