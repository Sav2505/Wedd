import { pool } from '../db/pool';
import {
    FirstContactMailPayload,
    OpenWeddingResult,
    WeddingRequest,
} from '../types';
import { createError } from '../middleware/errorHandler';
import { buildAdminNewWeddingRequestTemplate, buildCoupleCredentialsTemplate, buildFirstContactBitTemplate } from './emailTemplates.service';
import { generateCoupleLoginCodeFromGuestId } from './auth.service';
import { sendMail } from './email.service';
import { SendEmailResult } from './mailer.service';

function makeCoupleNamesUnique(
    groomName: string,
    brideName: string,
): {
    groomName: string;
    brideName: string;
} {
    const normalize = (name: string) =>
        name
            .trim()
            .replace(/\s+/g, ' ');

    const groom = normalize(groomName);
    const bride = normalize(brideName);

    if (groom === bride) {
        return {
            groomName: `${groom} חתן`,
            brideName: `${bride} כלה`,
        };
    }

    return {
        groomName: groom,
        brideName: bride,
    };
}

export interface CreateWeddingRequest {
    bride_name: string;
    groom_name: string;
    wedding_date: string;
    email: string;
    phone_number?: string;
}

interface CoupleGuestRow {
    id: string;
    full_name: string;
    side: 'חתן' | 'כלה';
}

const DAN_HAVIV_FULL_NAME = 'דן חביב';
let ensureWeddingRequestsAdminColumnsPromise: Promise<void> | null = null;

async function ensureWeddingRequestsAdminColumns(): Promise<void> {
    if (!ensureWeddingRequestsAdminColumnsPromise) {
        ensureWeddingRequestsAdminColumnsPromise = (async () => {
            await pool.query(`
                ALTER TABLE wedding_requests
                ADD COLUMN IF NOT EXISTS first_contact_sent_at TIMESTAMPTZ DEFAULT NULL,
                ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ DEFAULT NULL,
                ADD COLUMN IF NOT EXISTS opened_by UUID REFERENCES guests(id),
                ADD COLUMN IF NOT EXISTS open_notes TEXT DEFAULT NULL
            `);

            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_wedding_requests_status_updated_at
                ON wedding_requests(status, updated_at DESC)
            `);
        })().catch((err) => {
            ensureWeddingRequestsAdminColumnsPromise = null;
            throw err;
        });
    }

    await ensureWeddingRequestsAdminColumnsPromise;
}

function normalizeWhitespace(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
}

function toISODateOnly(value: string): string {
    return new Date(value + 'T12:00:00').toISOString().slice(0, 10);
}

export async function createWeddingRequest(
    data: CreateWeddingRequest,
): Promise<WeddingRequest> {
    const {
        brideName,
        groomName,
    } = makeCoupleNamesUnique(
        normalizeWhitespace(data.groom_name),
        normalizeWhitespace(data.bride_name),
    );
    const email = data.email.trim().toLowerCase();
    const phone = data?.phone_number?.trim();

    if (!brideName || !groomName || !email) {
        throw createError('כל שדות בקשת ההרשמה הם חובה', 400);
    }

    const weddingDate = toISODateOnly(data.wedding_date);

    const { rows } = await pool.query<WeddingRequest>(
        `
        INSERT INTO wedding_requests
        (
            bride_name,
            groom_name,
            wedding_date,
            email,
            phone_number
            )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        `,
        [
            brideName,
            groomName,
            weddingDate,
            email,
            phone,
        ],
    );

    return rows[0];
}

export async function listWeddingRequests(): Promise<WeddingRequest[]> {
    await ensureWeddingRequestsAdminColumns();

    const { rows } = await pool.query<WeddingRequest>(
        `
        SELECT *
        FROM wedding_requests
        ORDER BY
          CASE status
            WHEN 'new' THEN 0
            WHEN 'confirmed' THEN 1
            ELSE 2
          END,
          updated_at DESC,
          id DESC
        `,
    );

    return rows;
}

export async function assertDanHavivCouple(coupleId: string): Promise<void> {
    const { rows } = await pool.query<{ full_name: string }>(
        `
        SELECT full_name
        FROM guests
        WHERE id = $1
          AND role = 'couple'
        LIMIT 1
        `,
        [coupleId],
    );

    if (rows.length === 0) {
        throw createError('אין הרשאה — גישה לחתן/כלה בלבד', 403);
    }

    const fullName = normalizeWhitespace(rows[0].full_name);
    if (fullName !== DAN_HAVIV_FULL_NAME) {
        throw createError('אין הרשאה למסך בקשות הרשמה', 403);
    }
}

export async function sendFirstContact(requestId: number): Promise<{
    request: WeddingRequest;
    mailLog: { messageId: string; to: string; subject: string };
    preview: FirstContactMailPayload;
}> {
    await ensureWeddingRequestsAdminColumns();

    const { rows } = await pool.query<WeddingRequest>(
        `SELECT * FROM wedding_requests WHERE id = $1 LIMIT 1`,
        [requestId],
    );

    if (!rows[0]) {
        throw createError('בקשת הרשמה לא נמצאה', 404);
    }

    const request = rows[0];
    const template = buildFirstContactBitTemplate({
        brideName: request.bride_name,
        groomName: request.groom_name,
        amountNis: 149,
        bitPhone: 'XXX',
    });

    let mailResult: SendEmailResult;
    try {
        mailResult = await sendMail({
            to: request.email,
            subject: template.subject,
            html: template.html,
            text: template.text,
        });
    } catch (err) {
        throw createError('שליחת המייל נכשלה, נסה שוב', 502);
    }

    const updated = await pool.query<WeddingRequest>(
        `
        UPDATE wedding_requests
        SET first_contact_sent_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
        `,
        [requestId],
    );

    return {
        request: updated.rows[0],
        mailLog: {
            messageId: mailResult?.messageId ?? '',
            to: request.email,
            subject: template.subject,
        },
        preview: template,
    };
}

export async function openWedding(
    requestId: number,
    openedBy: string,
    note?: string,
): Promise<OpenWeddingResult> {
    await ensureWeddingRequestsAdminColumns();

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const reqResult = await client.query<WeddingRequest>(
            `
            SELECT *
            FROM wedding_requests
            WHERE id = $1
            FOR UPDATE
            `,
            [requestId],
        );

        const request = reqResult.rows[0];
        if (!request) {
            throw createError('בקשת הרשמה לא נמצאה', 404);
        }

        if (request.status === 'cancelled') {
            throw createError('לא ניתן לפתוח חתונה לבקשה שבוטלה', 409);
        }

        if (request.opened_at) {
            throw createError('בקשה זו כבר נפתחה בעבר', 409);
        }

        let brideName = normalizeWhitespace(request.bride_name);
        let groomName = normalizeWhitespace(request.groom_name);
        const phone = request.phone_number.trim();

        // const existingCouples = await client.query<{ id: string }>(
        //     `
        //     SELECT id
        //     FROM guests
        //     WHERE role = 'couple'
        //       AND full_name = ANY($1::text[])
        //     LIMIT 1
        //     `,
        //     [[brideName, groomName]],
        // );

        // if (existingCouples.rows.length > 0) {
        //     throw createError('כבר קיימים משתמשי זוג לשמות אלו', 409);
        // }

        const createdWedding = await client.query<{ id: number }>(
            `
            INSERT INTO wedding_info (
                bride_name,
                groom_name,
                wedding_date
            )
            VALUES ($1, $2, $3)
            RETURNING id
            `,
            [
                brideName,
                groomName,
                request.wedding_date,
            ],
        );

        const weddingId = createdWedding.rows[0].id;

        const createdCouples = await client.query<CoupleGuestRow>(
            `
            INSERT INTO guests (full_name, phone, table_number, side, role, wedding_id)
            VALUES
              ($1, $3, NULL, 'חתן', 'couple', $4),
              ($2, $3, NULL, 'כלה', 'couple', $4)
            RETURNING id, full_name, side
            `,
            [groomName, brideName, phone, weddingId],
        );

        const credentials = createdCouples.rows.map((row) => ({
            full_name: row.full_name,
            side: row.side,
            code: generateCoupleLoginCodeFromGuestId(row.id),
        }));

        const credentialsTemplate = buildCoupleCredentialsTemplate({
            brideName,
            groomName,
            credentials,
        });

        const mailResult: SendEmailResult = await sendMail({
            to: request.email,
            subject: credentialsTemplate.subject,
            html: credentialsTemplate.html,
            text: credentialsTemplate.text,
        });

        const notes = note?.trim() || null;

        const updateResult = await client.query<WeddingRequest>(
            `
            UPDATE wedding_requests
            SET status = 'confirmed',
                opened_at = NOW(),
                opened_by = $2,
                open_notes = $3,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            `,
            [requestId, openedBy, notes],
        );

        await client.query('COMMIT');

        return {
            request: updateResult.rows[0],
            credentials,
            mailLog: {
                messageId: mailResult.messageId || '',
                to: request.email,
                subject: credentialsTemplate.subject,
            },
        };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

export async function notifyAdmin(
    requestId: number,
): Promise<{
    request: WeddingRequest;
    mailLog: {
        messageId: string;
        to: string;
        subject: string;
    };
}> {
    await ensureWeddingRequestsAdminColumns();

    const { rows } = await pool.query<WeddingRequest>(
        `
        SELECT *
        FROM wedding_requests
        WHERE id = $1
        LIMIT 1
        `,
        [requestId],
    );

    const request = rows[0];

    if (!request) {
        throw createError('בקשת הרשמה לא נמצאה', 404);
    }

    const template = buildAdminNewWeddingRequestTemplate({
        brideName: request.bride_name,
        groomName: request.groom_name,
        weddingDate: request.wedding_date,
        email: request.email,
        phone: request.phone_number,
    });

    let mailResult: SendEmailResult;
    const adminMail = process.env.EMAIL_ADMIN;
    try {
        mailResult = await sendMail({
            to: adminMail || 'weddflowapp@gmail.com',
            subject: template.subject,
            html: template.html,
            text: template.text,
        });
    } catch (err) {
        throw createError('שליחת מייל למנהל נכשלה', 502);
    }

    return {
        request,
        mailLog: {
            messageId: mailResult?.messageId ?? '',
            to: adminMail || 'weddflowadd@gmail.com',
            subject: template.subject,
        },
    };
}