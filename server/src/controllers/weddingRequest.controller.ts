import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { createError } from '../middleware/errorHandler';
import * as service from '../services/weddingRequest.service';

const createWeddingRequestSchema = z.object({
    bride_name: z.string().trim().min(2, 'שם כלה חייב להכיל לפחות 2 תווים'),
    groom_name: z.string().trim().min(2, 'שם חתן חייב להכיל לפחות 2 תווים'),
    wedding_date: z.string().trim().min(8, 'תאריך חתונה הוא שדה חובה'),
    email: z.string().trim().email('כתובת אימייל לא תקינה'),
    phone_number: z.string().trim().optional(),
});

const idParamSchema = z.object({
    id: z.coerce.number().int().positive(),
});

const openWeddingSchema = z.object({
    note: z.string().trim().max(400, 'הערה ארוכה מדי').optional(),
});

async function assertDanCouple(req: Request): Promise<string> {
    const coupleId = (req as Request & { coupleId?: string }).coupleId;
    if (!coupleId) {
        throw createError('נדרשת הזדהות זוגית', 401);
    }

    await service.assertDanHavivCouple(coupleId);
    return coupleId;
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const parsed = createWeddingRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            const message = parsed.error.errors.map((err) => err.message).join(', ');
            return next(createError(message, 400));
        }

        const wedding = await service.createWeddingRequest(parsed.data);

        res.json({
            success: true,
            data: wedding,
        });

    } catch (err) {
        next(err);
    }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        await assertDanCouple(req);
        const requests = await service.listWeddingRequests();
        res.json({ success: true, data: requests });
    } catch (err) {
        next(err);
    }
}

export async function sendFirstContact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        await assertDanCouple(req);
        const parsed = idParamSchema.safeParse(req.params);
        if (!parsed.success) {
            return next(createError('מזהה בקשה לא תקין', 400));
        }

        const result = await service.sendFirstContact(parsed.data.id);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
}

export async function openWedding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const coupleId = await assertDanCouple(req);

        const parsedParams = idParamSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(createError('מזהה בקשה לא תקין', 400));
        }

        const parsedBody = openWeddingSchema.safeParse(req.body ?? {});
        if (!parsedBody.success) {
            const message = parsedBody.error.errors.map((err) => err.message).join(', ');
            return next(createError(message, 400));
        }

        const result = await service.openWedding(
            parsedParams.data.id,
            coupleId,
            parsedBody.data.note,
        );

        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
}

export async function notifyAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const parsed = idParamSchema.safeParse(req.params);
        if (!parsed.success) {
            return next(createError('מזהה בקשה לא תקין', 400));
        }

        await service.notifyAdmin(parsed.data.id);

        res.json({
            success: true,
            data: null,
        });
    } catch (err) {
        next(err);
    }
}