import { NextFunction, Request, Response } from 'express';
import { createError } from '../middleware/errorHandler';
import {
  clearInvitationImage,
  getInvitationImage,
  getWeddingMessageSchedule,
  updateWeddingMessageSchedule,
  saveInvitationImage,
} from '../services/weddingMessageSchedule.service';

function parseWeddingId(req: Request): number {
  const weddingId = Number(req.params.weddingId);
  if (!Number.isInteger(weddingId) || weddingId <= 0) {
    throw createError('מספר חתונה לא תקין', 400);
  }
  return weddingId;
}

export async function getSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const weddingId = parseWeddingId(req);
    const schedule = await getWeddingMessageSchedule(weddingId);
    res.json({ success: true, data: schedule });
  } catch (err) {
    next(err);
  }
}

export async function patchSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const weddingId = parseWeddingId(req);
    const patch = req.body as {
      invitation_days_before?: number;
      reminder_days_before?: number;
      day_before_offset_days?: number;
    };

    const schedule = await updateWeddingMessageSchedule(weddingId, patch);
    res.json({ success: true, data: schedule });
  } catch (err) {
    next(err);
  }
}

export async function uploadInvitationImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const weddingId = parseWeddingId(req);

    if (!req.file) {
      throw createError('קובץ תמונה הוא שדה חובה', 400);
    }

    const schedule = await saveInvitationImage(weddingId, req.file);
    res.status(201).json({ success: true, data: schedule });
  } catch (err) {
    next(err);
  }
}

export async function downloadInvitationImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const weddingId = parseWeddingId(req);
    const image = await getInvitationImage(weddingId);

    res.set({
      'Content-Type': image.invitation_image_mime_type ?? 'application/octet-stream',
      'Content-Disposition': `inline; filename="${encodeURIComponent(image.invitation_image_filename ?? 'invitation-image')}"`,
      'Cache-Control': 'private, max-age=60',
    });

    res.send(image.invitation_image);
  } catch (err) {
    next(err);
  }
}

export async function deleteInvitationImage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const weddingId = parseWeddingId(req);
    const schedule = await clearInvitationImage(weddingId);
    res.json({ success: true, data: schedule });
  } catch (err) {
    next(err);
  }
}
