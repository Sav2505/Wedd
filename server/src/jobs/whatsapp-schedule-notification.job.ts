// whatsapp-schedule-notification.job.ts

import cron from 'node-cron';
import { DateTime } from 'luxon';
import { ISRAEL_TIMEZONE } from '../utils/scheduling.util';

const DEFAULT_CRON =
    process.env.WHATSAPP_SCHEDULE_NOTIFICATION_CRON ?? '0 12 * * *';

const ENABLED =
    String(
        process.env.WHATSAPP_SCHEDULE_NOTIFICATION_ENABLED ?? 'true',
    ).toLowerCase() === 'true';

export async function runWhatsappScheduleNotificationOnce(): Promise<void> {
    console.log(
        `[WhatsApp Schedule Notification] Running (${DateTime.now()
            .setZone(ISRAEL_TIMEZONE)
            .toFormat('dd/LL/yyyy HH:mm')})`,
    );

    // TODO:
    // 1. לעבור על כל החתונות
    // 2. לבדוק האם מחר יש שליחת הודעה
    // 3. לחשב כמה נמענים
    // 4. לשלוף את המיילים של החתן והכלה
    // 5. buildTomorrowWhatsappEmail(...)
    // 6. sendMail(...)
}

export function initWhatsappScheduleNotificationJob(): void {
    if (!ENABLED) {
        console.log(
            '[WhatsApp Schedule Notification] disabled by env flag.',
        );
        return;
    }

    cron.schedule(
        DEFAULT_CRON,
        () => {
            runWhatsappScheduleNotificationOnce().catch((err) => {
                console.error(
                    '[WhatsApp Schedule Notification] run failed:',
                    err?.message ?? err,
                );
            });
        },
        {
            timezone: ISRAEL_TIMEZONE,
        },
    );

    console.log(
        `[WhatsApp Schedule Notification] initialized with cron "${DEFAULT_CRON}" (${ISRAEL_TIMEZONE}).`,
    );
}