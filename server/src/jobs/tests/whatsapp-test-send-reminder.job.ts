import { DateTime } from 'luxon';
import { pool } from '../../db/pool';
import {
    buildTemplateComponents,
    sendTemplateMessageWithRetry,
} from '../../services/whatsapp.service';
import { getInvitationImage } from '../../services/weddingMessageSchedule.service';
import { ISRAEL_TIMEZONE } from '../../utils/scheduling.util';

const TEST_IDENTITIES: Array<{ firstName: string; phoneSuffix: string }> = [
    { firstName: 'דן', phoneSuffix: '9899' },
    { firstName: 'שחר', phoneSuffix: '7400' },
];

interface TestGuestMatchRow {
    guest_id: string;
    guest_full_name: string;
    guest_first_name: string | null;
    guest_phone: string;
    wedding_id: number;
    bride_name: string;
    groom_name: string;
    wedding_date: string;
    wedding_time: string;
    wedding_canpoy_time: string;
    venue_name: string;
    venue_address: string;
}

// שולף את כל האורחים שתואמים זהות בדיקה ספציפית (שם פרטי + סיומת טלפון), בכל החתונות
async function findTestGuestMatches(identity: { firstName: string; phoneSuffix: string }): Promise<TestGuestMatchRow[]> {
    const query = `
    SELECT
      g.id AS guest_id,
      g.full_name AS guest_full_name,
      g.first_name AS guest_first_name,
      g.phone AS guest_phone,
      wi.id AS wedding_id,
      wi.bride_name,
      wi.groom_name,
      wi.wedding_date,
      wi.wedding_time,
      wi.wedding_canpoy_time,
      wi.venue_name,
      wi.venue_address
    FROM guests g
    JOIN wedding_info wi ON wi.id = g.wedding_id
    WHERE g.role = 'guest'
      AND g.phone LIKE '%${identity.phoneSuffix}'
      AND TRIM(g.first_name) = '${identity.firstName}'
  `;

    console.log(`[Test Send] 🧪 findTestGuestMatches(firstName="${identity.firstName}", phoneSuffix="${identity.phoneSuffix}") SQL:\n${query}`);
    const { rows } = await pool.query<TestGuestMatchRow>(query);
    return rows;
}

function formatTimeShort(time: string | null | undefined): string {
    if (!time) return '';
    return time.slice(0, 5);
}

function buildGuestUrl(weddingId: number, fullName: string, phone: string): string {
    const base = (process.env.GUEST_PORTAL_BASE_URL ?? process.env.CLIENT_BASE_URL ?? 'http://localhost:5173').replace(/\/$/, '');
    const digits = phone.replace(/\D/g, '');
    const params = new URLSearchParams({
        n: fullName,
        p: digits.slice(-4),
        w: String(weddingId),
    });
    return `${base}/?${params.toString()}`;
}

// הפונקציה עצמה - עוברת על כל זהויות הבדיקה, מאמתת כל אחת בנפרד, ואז שולחת לכל המאושרות
export async function runOneOffTestSendToDan(): Promise<void> {
    console.log('\n[Test Send] 🧪 ========== runOneOffTestSendToDan START ==========');
    console.log(`[Test Send] 🧪 Test identities configured: ${TEST_IDENTITIES.map((i) => `${i.firstName}/*${i.phoneSuffix}`).join(', ')}`);

    const confirmedGuests: TestGuestMatchRow[] = [];

    // שלב 1: אימות כל זהות בנפרד - חייבת להימצא בדיוק שורה אחת לכל אחת
    for (const identity of TEST_IDENTITIES) {
        console.log(`\n[Test Send] 🧪 --- Checking identity: firstName="${identity.firstName}", phoneSuffix="${identity.phoneSuffix}" ---`);
        const matches = await findTestGuestMatches(identity);

        console.log(`[Test Send] 🧪 Found ${matches.length} matching guest(s) for this identity:`);
        matches.forEach((m, i) => {
            console.log(
                `[Test Send] 🧪   [${i}] guest_id=${m.guest_id} | full_name="${m.guest_full_name}" | phone=${m.guest_phone} | wedding_id=${m.wedding_id} (${m.bride_name} & ${m.groom_name})`,
            );
        });

        if (matches.length === 0) {
            console.error(`[Test Send] 🧪 ❌ SKIP identity "${identity.firstName}/*${identity.phoneSuffix}": no matching guest found.`);
            continue;
        }
        if (matches.length > 1) {
            console.error(`[Test Send] 🧪 ❌ SKIP identity "${identity.firstName}/*${identity.phoneSuffix}": found ${matches.length} guests (expected exactly 1). Refusing to send to avoid ambiguity.`);
            continue;
        }

        console.log(`[Test Send] 🧪 ✅ Confirmed unique match for "${identity.firstName}/*${identity.phoneSuffix}": ${matches[0].guest_full_name} (${matches[0].guest_phone})`);
        confirmedGuests.push(matches[0]);
    }

    if (confirmedGuests.length === 0) {
        console.error('[Test Send] 🧪 ❌ ABORT: no test identity resolved to exactly one guest. Nothing will be sent.');
        console.log('[Test Send] 🧪 ========== runOneOffTestSendToDan END (aborted) ==========\n');
        return;
    }

    console.log(`\n[Test Send] 🧪 Proceeding to send to ${confirmedGuests.length} confirmed guest(s): ${confirmedGuests.map((g) => `${g.guest_full_name} (${g.guest_phone})`).join(', ')}`);

    // שלב 2: שליחה בפועל לכל אורח מאושר
    for (const guest of confirmedGuests) {
        console.log(`\n[Test Send] 🧪 --- Sending to: ${guest.guest_full_name} (${guest.guest_phone}), wedding_id=${guest.wedding_id} ---`);

        try {
            const schedule = await getInvitationImage(guest.wedding_id);
            const mediaId = schedule?.invitation_image_media_id;

            console.log(`[Test Send] 🧪 invitation_image_media_id for wedding_id=${guest.wedding_id}: ${mediaId ?? '(MISSING!)'}`);

            if (!mediaId) {
                console.error(
                    `[Test Send] 🧪 ❌ SKIP ${guest.guest_full_name}: no invitation_image_media_id found for wedding_id=${guest.wedding_id}. ` +
                    `The "wedding_confirmation" template requires a header image - upload one for this wedding before testing.`,
                );
                continue;
            }

            const guestFirstName = (guest.guest_first_name?.trim() || guest.guest_full_name.split(/\s+/)[0] || '').trim();
            const weddingDisplayName = `${guest.bride_name} & ${guest.groom_name}`;
            const guestUrl = buildGuestUrl(guest.wedding_id, guest.guest_full_name, guest.guest_phone);

            console.log(`[Test Send] 🧪 guestUrl=${guestUrl}`);

            const components = buildTemplateComponents({
                templateName: 'wedding_reminder',
                guestFullName: guest.guest_full_name,
                guestFirstName,
                weddingDisplayName,
                weddingDate: guest.wedding_date,
                weddingTime: formatTimeShort(guest.wedding_time),
                weddingCanpoyTime: formatTimeShort(guest.wedding_canpoy_time),
                venueName: guest.venue_name,
                venueAddress: guest.venue_address,
                guestUrl,
            });

            const sendResult = await sendTemplateMessageWithRetry({
                to: guest.guest_phone,
                templateName: 'wedding_reminder',
                languageCode: 'he',
                components,
            });

            console.log(`[Test Send] 🧪 ✅ SENT OK to ${guest.guest_full_name}: messageId=${sendResult.messageId}, attempts=${sendResult.attempts}`);
        } catch (err: any) {
            console.error(`[Test Send] 🧪 ❌ SEND FAILED for ${guest.guest_full_name}: ${err?.message ?? err}`);
        }
    }

    console.log('[Test Send] 🧪 ========== runOneOffTestSendToDan END ==========\n');
}

// מתזמן ריצה חד-פעמית להיום ב-12:30, שעון ישראל (זמן אמיתי, לא מדומה)
export function scheduleOneOffTestSendToday1230Reminder(): void {
    const now = DateTime.now().setZone(ISRAEL_TIMEZONE);
    const target = now.set({ hour: 12, minute: 30, second: 0, millisecond: 0 });

    const msUntilTarget = target.toMillis() - now.toMillis();

    if (msUntilTarget <= 0) {
        console.log(
            `[Test Send] 🧪 Target time 12:30 today (${target.toFormat('dd/LL/yyyy HH:mm')}) has already passed (now=${now.toFormat('HH:mm')}). Running immediately instead.`,
        );
        runOneOffTestSendToDan().catch((err) => console.error('[Test Send] Unexpected error:', err));
        return;
    }

    console.log(
        `[Test Send] 🧪 Scheduled one-off test send for today at 12:30 (${target.toFormat('dd/LL/yyyy HH:mm')}, ${ISRAEL_TIMEZONE}). Waiting ${Math.round(msUntilTarget / 1000)}s...`,
    );

    setTimeout(() => {
        runOneOffTestSendToDan().catch((err) => console.error('[Test Send] Unexpected error:', err));
    }, msUntilTarget);
}