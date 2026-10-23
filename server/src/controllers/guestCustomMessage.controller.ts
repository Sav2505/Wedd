import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { createError } from '../middleware/errorHandler';
import * as service from '../services/guestCustomMessage.service';

const audienceSchema = z.enum(['COMING', 'PENDING', 'ALL']);
const createSchema = z.object({
  audience: audienceSchema,
  message_body: z.string().trim().min(1).max(1024),
  scheduled_at: z.string().datetime({ offset: true }),
});
const reviewSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  note: z.string().trim().max(1000).optional(),
});

function getCoupleId(req: Request): string {
  const coupleId = (req as Request & { coupleId?: string }).coupleId;
  if (!coupleId) throw createError('נדרשת הזדהות זוגית', 401);
  return coupleId;
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const weddingId = Number(req.params.weddingId);
    if (!Number.isInteger(weddingId) || weddingId <= 0) throw createError('מזהה חתונה לא תקין', 400);
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw createError('יש למלא קהל, תוכן עד 1,024 תווים ותאריך תקין', 400);
    if (new Date(parsed.data.scheduled_at).getTime() <= Date.now()) {
      throw createError('יש לבחור מועד עתידי', 400);
    }
    res.status(201).json({
      success: true,
      data: await service.createGuestMessageRequest(getCoupleId(req), weddingId, parsed.data),
    });
  } catch (error) {
    next(error);
  }
}

export async function listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const weddingId = Number(req.params.weddingId);
    if (!Number.isInteger(weddingId) || weddingId <= 0) throw createError('מזהה חתונה לא תקין', 400);
    res.json({
      success: true,
      data: await service.listCoupleGuestMessageRequests(getCoupleId(req), weddingId),
    });
  } catch (error) {
    next(error);
  }
}

export async function listAdmin(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const coupleId = getCoupleId(_req);
    res.json({ success: true, data: await service.listAdminGuestMessageRequests(coupleId) });
  } catch (error) {
    next(error);
  }
}

export async function review(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const requestId = Number(req.params.id);
    if (!Number.isInteger(requestId) || requestId <= 0) throw createError('מזהה בקשה לא תקין', 400);
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) throw createError('פעולת האישור או הערת האדמין אינן תקינות', 400);
    res.json({
      success: true,
      data: await service.reviewGuestMessageRequest(
        getCoupleId(req),
        requestId,
        parsed.data.decision,
        parsed.data.note,
      ),
    });
  } catch (error) {
    next(error);
  }
}