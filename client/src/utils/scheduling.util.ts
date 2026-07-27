import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const ISRAEL_TIMEZONE = 'Asia/Jerusalem';

export interface WeddingScheduleInput {
    invitation_days_before: number;
    reminder_days_before: number;
    day_before_offset_days: number;
}

export interface WeddingScheduleComputed {
    invitation_send_at: string;
    reminder_send_at: string;
    day_before_send_at: string;
}

function atNoonIsrael(dateIso: string): dayjs.Dayjs {
    return dayjs.tz(`${dateIso}T12:00:00`, ISRAEL_TIMEZONE);
}

function deferSaturdayToSundayNoon(date: dayjs.Dayjs): dayjs.Dayjs {
    // dayjs day(): 0 Sunday ... 6 Saturday
    if (date.day() !== 6) {
        return date;
    }

    return date.add(1, 'day').hour(12).minute(0).second(0).millisecond(0);
}

export function computeSchedulePreview(
    weddingDateIso: string,
    input: WeddingScheduleInput,
): WeddingScheduleComputed {
    const wedding = atNoonIsrael(weddingDateIso);

    const invitation = deferSaturdayToSundayNoon(
        wedding.subtract(input.invitation_days_before, 'day'),
    );

    const reminder = deferSaturdayToSundayNoon(
        wedding.subtract(input.reminder_days_before, 'day'),
    );

    let dayBefore = wedding.subtract(input.day_before_offset_days, 'day');

    // Sunday wedding => if computed day is Saturday, move to Friday noon.
    if (wedding.day() === 0 && dayBefore.day() === 6) {
        dayBefore = dayBefore.subtract(1, 'day').hour(12).minute(0).second(0).millisecond(0);
    }

    return {
        invitation_send_at: invitation.toISOString(),
        reminder_send_at: reminder.toISOString(),
        day_before_send_at: dayBefore.toISOString(),
    };
}

export function formatScheduleDateTime(value: string): string {
    return 'יום ' + dayjs(value)
        .tz(ISRAEL_TIMEZONE)
        .locale('he')
        .format('dddd, DD/MM/YYYY [בשעה] HH:mm');
}
