import { Request, Response, NextFunction } from 'express';
import * as infoService from '../services/info.service';
import { createError } from '../middleware/errorHandler';

export async function getInfo(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const weddingId = req.query.weddingId as string;

    if (!weddingId || Number.isNaN(Number(weddingId))) {
      throw createError('לא נמצא מזהה חתונה', 400);
    }

    const info = await infoService.getWeddingInfoByWeddingId(Number(weddingId));

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
    const weddingId = req.body.wedding_id as number;

    if (!weddingId) {
      throw createError('לא נמצא מזהה חתונה', 400);
    }

    const { wedding_id, ...updateData } = req.body;
    const updated = await infoService.updateWeddingInfo(
      updateData as infoService.WeddingInfoUpdate,
      weddingId,
    );
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

    const weddingId = Number(req.body.wedding_id);
    if (!weddingId || Number.isNaN(weddingId)) {
      throw createError('לא נמצא מזהה חתונה', 400);
    }

    const updated = await infoService.updateHeroImage(file.filename, weddingId);
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}