import { DateTime } from 'luxon';

export type SupportedWeddingTemplate =
    | 'wedding_invitation'
    | 'wedding_reminder'
    | 'wedding_day_before';

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
    venueName: string;
    venueAddress: string;
    guestUrl: string;
    invitationImageMediaId?: string;
}

function formatWeddingDateForMessage(dateValue: string): string {
    return DateTime.fromISO(dateValue, { zone: 'Asia/Jerusalem' }).toLocaleString({
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
}

export function buildTemplateComponents(input: BuildTemplateComponentsInput): unknown[] {
    const formattedDate = formatWeddingDateForMessage(input.weddingDate);

    const headerComponent =
        input.templateName === 'wedding_invitation' && input.invitationImageMediaId
            ? [{
                type: 'header',
                parameters: [{ type: 'image', image: { id: input.invitationImageMediaId } }],
            }]
            : [{
                type: 'header',
                parameters: [{ type: 'text', text: input.guestFirstName }],
            }];

    const bodyCommon = [
        { type: 'text', text: input.guestFirstName },
        { type: 'text', text: input.weddingDisplayName },
        { type: 'text', text: formattedDate },
        { type: 'text', text: input.weddingTime },
        { type: 'text', text: input.venueName },
        { type: 'text', text: input.venueAddress },
    ];

    if (input.templateName === 'wedding_day_before') {
        return [
            ...headerComponent,
            {
                type: 'body',
                parameters: bodyCommon,
            },
            {
                type: 'button',
                sub_type: 'url',
                index: '0',
                parameters: [{ type: 'text', text: input.guestUrl }],
            },
        ];
    }

    if (input.templateName === 'wedding_reminder') {
        return [
            ...headerComponent,
            {
                type: 'body',
                parameters: bodyCommon,
            },
            {
                type: 'button',
                sub_type: 'url',
                index: '0',
                parameters: [{ type: 'text', text: input.guestUrl }],
            },
        ];
    }

    return [
        ...headerComponent,
        {
            type: 'body',
            parameters: bodyCommon,
        },
        {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [{ type: 'text', text: input.guestUrl }],
        },
    ];
}

export async function sendTestMessage(to: string): Promise<unknown> {
    const result = await sendTemplateMessageWithRetry({
        to,
        templateName: 'hello_world',
        languageCode: 'en_US',
    });
    return result.raw;
}