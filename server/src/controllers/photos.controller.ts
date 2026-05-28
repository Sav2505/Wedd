import { Request, Response, NextFunction } from 'express';
import * as photosService from '../services/photos.service';
import { createError } from '../middleware/errorHandler';

export async function getPhotos(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const photos = await photosService.getAllPhotos();
    res.status(200).json({ success: true, data: photos });
  } catch (err) {
    next(err);
  }
}

export async function uploadPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const uploaderId = req.body.uploaderId as string | undefined;
    if (!uploaderId) return next(createError('uploaderId הוא שדה חובה', 400));

    const file = req.file;
    if (!file) return next(createError('קובץ תמונה הוא שדה חובה', 400));

    const photo = await photosService.savePhoto(
      uploaderId,
      file.filename,
      req.body.caption as string | undefined,
    );

    res.status(201).json({ success: true, data: photo });
  } catch (err) {
    next(err);
  }
}

export async function deletePhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const requesterId = req.body.requesterId as string | undefined;
    if (!requesterId) return next(createError('requesterId הוא שדה חובה', 400));

    await photosService.deletePhoto(id, requesterId);
    res.status(200).json({ success: true, message: 'התמונה נמחקה בהצלחה' });
  } catch (err) {
    next(err);
  }
}
