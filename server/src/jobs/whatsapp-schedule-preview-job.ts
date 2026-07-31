import cron from 'node-cron';
import { DateTime } from 'luxon';
import { buildWeddingSchedulePreview } from './whatsapp-scheduler.job';
import { ISRAEL_TIMEZONE } from '../utils/scheduling.util';
import { sendMail } from '../services/email.service';

export async function runWhatsappSchedulePreviewOnce(): Promise<void> {
    const recipient = process.env.EMAIL_ADMIN;

    if (!recipient) {
        console.log('[WhatsApp Schedule Preview] skipped: EMAIL_ADMIN is not configured.');
        return;
    }

    const report = await buildWeddingSchedulePreview();

    await sendMail({
        to: recipient,
        subject: `WhatsApp Schedule Preview - ${DateTime.now()
            .setZone(ISRAEL_TIMEZONE)
            .toFormat('dd/LL/yyyy HH:mm')}`,
        html: report.html,
        text: report.text,
    });

    console.log('[WhatsApp Schedule Preview] Preview email sent.');
}

export function initWhatsappSchedulePreviewJob(): void {
    const enabled =
        String(process.env.WHATSAPP_SCHEDULE_PREVIEW_ENABLED ?? 'true').toLowerCase() === 'true';

    if (!enabled) {
        console.log('[WhatsApp Schedule Preview] disabled by env flag.');
        return;
    }

    const cronExpression =
        process.env.WHATSAPP_SCHEDULE_PREVIEW_CRON ?? '0 12 * * *';

    cron.schedule(
        cronExpression,
        () => {
            runWhatsappSchedulePreviewOnce().catch((err) => {
                console.error(
                    '[WhatsApp Schedule Preview] run failed:',
                    err?.message ?? err,
                );
            });
        },
        {
            timezone: ISRAEL_TIMEZONE,
        },
    );

    console.log(
        `[WhatsApp Schedule Preview] initialized with cron "${cronExpression}" (${ISRAEL_TIMEZONE}).`,
    );
}