import { NextFunction, Request, Response } from 'express';
import { sendConfirmationForCouple } from '../services/weddingConfirmation.service';
import { createError } from '../middleware/errorHandler';

export async function sendWhatsappTest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { guestId } = req.body;
        if (typeof guestId !== 'string' || !guestId.trim()) throw createError('מזהה אורח לא תקין', 400);
        await sendConfirmationForCouple((req as Request & { coupleId: string }).coupleId, guestId);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
}