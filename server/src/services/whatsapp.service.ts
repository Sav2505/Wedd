import { DateTime } from 'luxon';
import { getInvitationImage } from './weddingMessageSchedule.service';
import { buildGuestUrl } from '../utils/guestUrl';
import { getGuestByGuestId } from './guests.service';
import { getWeddingInfoByWeddingId } from './info.service';

export type SupportedWeddingTemplate =
    | 'wedding_confirmation'
    | 'wedding_reminder'
    | 'wedding_day_before'
    | 'wedding_post_thanks'
    | 'wedding_thank_you';

/**
 * Tab index mapping for guest UI:
 * 0 = פרטי האירוע (InfoTab)
 * 1 = הושבה (SeatingTab)
 * 2 = גלריה (PhotosTab)
 * 3 = מאיתנו אליכם (MessageTab)
 * 4 = סטטוס הגעה (AttendanceStatusTab)
 */
export const TEMPLATE_TO_TAB_INDEX: Record<SupportedWeddingTemplate, number> = {
    'wedding_confirmation': 4,      // סטטוס הגעה
    'wedding_reminder': 4,           // סטטוס הגעה
    'wedding_day_before': 0,         // פרטי האירוע
    'wedding_post_thanks': 2,        // גלריה
    'wedding_thank_you': 0,          // פרטי האירוע (default)
};

export interface SendTemplatePayload {
    to: string;
    templateName: string;
    languageCode?: string;
    components?: unknown[];
}

export interface SendTemplateResult {
    messageId: string;
    raw: unknown;
    attempts: number;
}

export interface UploadMediaInput {
    data: Buffer;
    mimeType: string;
    filename: string;
}

interface WhatsAppApiErrorOptions {
    statusCode?: number;
    metaCode?: number;
    raw?: unknown;
}

export class WhatsAppApiError extends Error {
    statusCode?: number;
    metaCode?: number;
    raw?: unknown;

    constructor(message: string, options: WhatsAppApiErrorOptions = {}) {
        super(message);
        this.name = 'WhatsAppApiError';
        this.statusCode = options.statusCode;
        this.metaCode = options.metaCode;
        this.raw = options.raw;
    }
}

const GRAPH_VERSION = 'v25.0';

function assertWhatsAppEnv(): { phoneNumberId: string; accessToken: string } {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
        throw new WhatsAppApiError('Missing WhatsApp credentials in environment');
    }

    return { phoneNumberId, accessToken };
}

function parseWhatsappErrorBody(body: any): { message: string; code?: number } {
    const message =
        body?.error?.message ??
        body?.message ??
        'WhatsApp API request failed';
    const code = Number(body?.error?.code);
    return { message, code: Number.isFinite(code) ? code : undefined };
}

function isRetryableError(err: unknown): boolean {
    if (!(err instanceof WhatsAppApiError)) return false;
    if (err.statusCode === 429) return true;
    if (err.metaCode === 130429) return true;
    if (err.statusCode && err.statusCode >= 500) return true;
    return false;
}

function normalizePhone(to: string): string {
    const digits = to.replace(/\D/g, '');
    if (digits.startsWith('0')) {
        return `972${digits.slice(1)}`;
    }
    return digits;
}

async function delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
}

async function graphRequest(path: string, init: RequestInit): Promise<any> {
    const { accessToken } = assertWhatsAppEnv();
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${path}`;

    const response = await fetch(url, {
        ...init,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            ...(init.headers ?? {}),
        },
    });

    let payload: any;
    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    if (!response.ok) {
        const parsed = parseWhatsappErrorBody(payload);
        throw new WhatsAppApiError(parsed.message, {
            statusCode: response.status,
            metaCode: parsed.code,
            raw: payload,
        });
    }

    return payload;
}

export async function uploadMediaToWhatsApp(input: UploadMediaInput): Promise<string> {
    const { phoneNumberId } = assertWhatsAppEnv();

    const form = new FormData();
    const blob = new Blob([new Uint8Array(input.data)], { type: input.mimeType });
    form.append('messaging_product', 'whatsapp');
    form.append('file', blob, input.filename);

    const payload = await graphRequest(`${phoneNumberId}/media`, {
        method: 'POST',
        body: form,
    });

    const mediaId = payload?.id;
    if (!mediaId || typeof mediaId !== 'string') {
        throw new WhatsAppApiError('Media upload succeeded without media id', { raw: payload });
    }

    return mediaId;
}

export async function sendTemplateMessage(payload: SendTemplatePayload): Promise<SendTemplateResult> {
    const { phoneNumberId } = assertWhatsAppEnv();

    const body = {
        messaging_product: 'whatsapp',
        to: normalizePhone(payload.to),
        type: 'template',
        template: {
            name: payload.templateName,
            language: { code: payload.languageCode ?? 'he' },
            ...(payload.components && payload.components.length > 0 ? { components: payload.components } : {}),
        },
    };

    const responsePayload = await graphRequest(`${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    const messageId = responsePayload?.messages?.[0]?.id;
    if (!messageId || typeof messageId !== 'string') {
        throw new WhatsAppApiError('WhatsApp API response missing message id', { raw: responsePayload });
    }

    return {
        messageId,
        raw: responsePayload,
        attempts: 1,
    };
}

export async function sendTemplateMessageWithRetry(
    payload: SendTemplatePayload,
    maxAttempts = 3,
): Promise<SendTemplateResult> {
    let attempt = 0;
    let delayMs = 1_200;

    while (attempt < maxAttempts) {
        attempt += 1;
        try {
            const sent = await sendTemplateMessage(payload);
            return {
                ...sent,
                attempts: attempt,
            };
        } catch (err) {
            if (attempt >= maxAttempts || !isRetryableError(err)) {
                throw err;
            }

            await delay(delayMs);
            delayMs = Math.min(delayMs * 2, 10_000);
        }
    }

    throw new WhatsAppApiError('Exceeded WhatsApp send retries');
}

export interface BuildTemplateComponentsInput {
    templateName: SupportedWeddingTemplate;
    guestFullName: string;
    guestFirstName: string;
    weddingDisplayName: string;
    weddingDate: string;
    weddingTime: string;
    weddingCanpoyTime: string;
    venueName: string;
    venueAddress: string;
    guestUrl: string;
    invitationImageMediaId?: string;
}

function formatWeddingDateForMessage(dateValue: string): string {
    return DateTime
        .fromISO(dateValue, { zone: 'Asia/Jerusalem' })
        .setLocale('he')
        .toLocaleString({
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        });
}

export function buildTemplateComponents(input: BuildTemplateComponentsInput): unknown[] {
    const formattedDate = formatWeddingDateForMessage(input.weddingDate);

    const buttonComponent = {
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [
            {
                type: 'text',
                text: input.guestUrl,
            },
        ],
    };

    switch (input.templateName) {
        case 'wedding_confirmation':
            return [
                {
                    type: 'header',
                    parameters: [
                        {
                            type: 'image',
                            image: {
                                id: input.invitationImageMediaId!,
                            },
                        },
                    ],
                },
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: input.guestFirstName },      // {{1}}
                        { type: 'text', text: formattedDate },             // {{2}}
                        { type: 'text', text: input.weddingTime },         // {{3}} קבלת פנים
                        { type: 'text', text: input.weddingCanpoyTime },   // {{4}} חופה
                        { type: 'text', text: input.weddingDisplayName },  // {{5}}
                    ],
                },
                buttonComponent,
            ];

        case 'wedding_reminder':
            return [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: input.guestFirstName },      // {{1}}
                        { type: 'text', text: formattedDate },             // {{2}}
                        { type: 'text', text: input.weddingTime },         // {{3}} קבלת פנים
                        { type: 'text', text: input.weddingCanpoyTime },   // {{4}} חופה
                        { type: 'text', text: input.weddingDisplayName },  // {{5}}
                    ],
                },
                buttonComponent,
            ];

        case 'wedding_day_before':
            return [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: input.guestFirstName },      // {{1}}
                        { type: 'text', text: formattedDate },             // {{2}}
                        { type: 'text', text: input.venueName },           // {{3}}
                        { type: 'text', text: input.weddingTime },         // {{4}} קבלת פנים
                        { type: 'text', text: input.weddingCanpoyTime },   // {{5}} חופה
                        { type: 'text', text: input.weddingDisplayName },  // {{6}}
                    ],
                },
                buttonComponent,
            ];

        case 'wedding_post_thanks':
            return [
                {
                    type: 'body',
                    parameters: [
                        { type: 'text', text: input.guestFirstName },      // {{1}}
                        { type: 'text', text: input.weddingDisplayName },  // {{2}}
                    ],
                },
                buttonComponent,
            ];

        default:
            throw new Error(`Unsupported WhatsApp template: ${input.templateName}`);
    }
}

// export async function sendTestMessage(to: string, weddingId: number): Promise<unknown> {
//     const schedule = await getInvitationImage(weddingId); // הפונקציה שכבר קיימת אצלכם
//     const mediaId = schedule.invitation_image_media_id;

//     if (!mediaId) {
//         throw new Error('No invitation media id found for this wedding - upload an image first');
//     }

//     const components = buildTemplateComponents({
//         templateName: 'wedding_confirmation',
//         guestFullName: 'דן כהן',
//         guestFirstName: 'דן',
//         weddingDisplayName: 'שחר ודן',
//         weddingDate: '2026-12-07',
//         weddingTime: '19:30',
//         weddingCanpoyTime: '20:30',
//         venueName: 'הגן בשפיים',
//         venueAddress: 'שפיים',
//         guestUrl: 'https://your-domain.com/guest?n=Dan&p=1234&w=1',
//         invitationImageMediaId: mediaId,
//     });

//     const result = await sendTemplateMessageWithRetry({
//         to,
//         templateName: 'wedding_confirmation',
//         languageCode: 'he',
//         components,
//     });

//     return result.raw;
// }

function formatTimeShort(time: string): string {
    return time.slice(0, 5);
}

export async function sendGuestInvitation(guestId: number, weddingId: number): Promise<unknown> {
    const guest = await getGuestByGuestId(guestId);
    if (!guest) {
        throw new Error(`Guest not found: ${guestId}`);
    }

    const wedding = await getWeddingInfoByWeddingId(weddingId);
    if (!wedding) {
        throw new Error(`Wedding not found: ${weddingId}`);
    }

    const schedule = await getInvitationImage(weddingId);
    const mediaId = schedule.invitation_image_media_id;
    // if (!mediaId) {
    //     throw new Error('No invitation media id found for this wedding - upload an image first');
    // }

    const lastFourDigits = guest.phone.replace(/\D/g, '').slice(-4);
    const tabIndex = TEMPLATE_TO_TAB_INDEX['wedding_confirmation'];
    const guestUrl = buildGuestUrl(guest.full_name, lastFourDigits, weddingId, tabIndex);

    const components = buildTemplateComponents({
        templateName: 'wedding_confirmation',
        guestFullName: guest.full_name,
        guestFirstName: guest.first_name,
        weddingDisplayName: `${wedding.bride_name} ו${wedding.groom_name}`,
        weddingDate: wedding.wedding_date,
        weddingTime: formatTimeShort(wedding.wedding_time),
        weddingCanpoyTime: formatTimeShort(wedding.wedding_canpoy_time),
        venueName: wedding.venue_name,
        venueAddress: wedding.venue_address,
        guestUrl,
        invitationImageMediaId: mediaId ?? undefined,
    });

    const result = await sendTemplateMessageWithRetry({
        to: guest.phone,
        templateName: 'wedding_confirmation',
        languageCode: 'he',
        components,
    });

    return result.raw;
}