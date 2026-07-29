import { Request, Response, NextFunction } from 'express';
import * as photosService from '../services/photos.service';
import { createError } from '../middleware/errorHandler';

export async function getPhotos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const weddingId = Number(req.query.weddingId);

    if (!weddingId) {
      res.status(400).json({
        success: false,
        message: 'חסר weddingId',
      });
      return;
    }

    const photos = await photosService.getAllPhotos(weddingId);

    res.status(200).json({
      success: true,
      data: photos,
    });
  } catch (err) {
    next(err);
  }
}

/** Serve compressed thumbnail — heavily cached, served for the gallery grid */
export async function getPhotoThumb(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await photosService.getPhotoData(req.params.id, 'thumb');
    if (!result) return next(createError('תמונה לא נמצאה', 404));
    res.set({
      'Content-Type': result.mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    res.send(result.data);
  } catch (err) {
    next(err);
  }
}

/** Serve full-resolution image — cached, served only when lightbox opens */
export async function getPhotoFull(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await photosService.getPhotoData(req.params.id, 'full');
    if (!result) return next(createError('תמונה לא נמצאה', 404));
    res.set({
      'Content-Type': result.mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    });
    res.send(result.data);
  } catch (err) {
    next(err);
  }
}

export async function uploadPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const weddingId = Number(req.body.weddingId);

    if (!weddingId) {
      return next(createError('weddingId הוא שדה חובה', 400));
    }

    const uploaderId = req.body.uploaderId as string | undefined;
    if (!uploaderId) return next(createError('uploaderId הוא שדה חובה', 400));

    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const thumbFile = files?.['thumb']?.[0];
    const fullFile = files?.['full']?.[0];

    if (!thumbFile || !fullFile) {
      return next(createError('שדות thumb ו-full נדרשים', 400));
    }

    const mimeType = thumbFile.mimetype;
    const photo = await photosService.savePhoto(
      weddingId,
      uploaderId,
      thumbFile.buffer,
      fullFile.buffer,
      mimeType,
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
    // Identity is validated by requireGuest middleware — read from header, never from body
    const requesterId = (req as Request & { guestId: string }).guestId;

    await photosService.deletePhoto(id, requesterId);
    res.status(200).json({ success: true, message: 'התמונה נמחקה בהצלחה' });
  } catch (err) {
    next(err);
  }
}

