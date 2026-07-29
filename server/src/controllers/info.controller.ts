import { Request, Response, NextFunction } from 'express';
import * as infoService from '../services/info.service';
import { createError } from '../middleware/errorHandler';

export async function getInfo(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const guestId = req.query.guestId as string;

    if (!guestId) {
      throw createError('לא נמצא מזהה משתמש', 400);
    }

    const info = await infoService.getWeddingInfoByGuestId(guestId);

    res.status(200).json({
      success: true,
      data: info,
    });

  } catch (err) {
    next(err);
  }
}

export async function updateInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const updated = await infoService.updateWeddingInfo(req.body as infoService.WeddingInfoUpdate);
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function updatePublishTables(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const weddingId = req.body.wedding_id as number;
    const updated = await infoService.updatePublishTables(req.body.is_published_tables as boolean, weddingId);
    if (!weddingId) {
      throw createError('לא נמצא מזהה חתונה', 400);
    }
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function uploadHero(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = req.file;
    if (!file) return next(createError('קובץ תמונה הוא שדה חובה', 400));
    const updated = await infoService.updateHeroImage(file.filename);
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}
