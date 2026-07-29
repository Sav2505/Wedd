import { Request, Response, NextFunction } from 'express';
import * as infoService from '../services/info.service';
import { createError } from '../middleware/errorHandler';

export async function getInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const guest = (req as Request & { guest?: { wedding_id: number } }).guest;

    if (!guest?.wedding_id) {
      throw createError('לא נמצאה חתונה למשתמש המחובר', 401);
    }

    const info = await infoService.getWeddingInfo(guest.wedding_id);

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
    const updated = await infoService.updatePublishTables(req.body.is_published_tables as boolean);
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
