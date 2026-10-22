import sharp from 'sharp';
import { createError } from '../middleware/errorHandler';

export async function normalizeMapImage(file: Express.Multer.File) {
  const formats: Record<string, string> = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' };
  if (!formats[file.mimetype] || !file.buffer.length || file.size > 5 * 1024 * 1024) {
    throw createError('יש לבחור תמונת JPEG, PNG או WebP עד 5MB', 400);
  }
  try {
    const image = sharp(file.buffer, { limitInputPixels: 16_000_000, failOn: 'warning' });
    const metadata = await image.metadata();
    if (metadata.format !== formats[file.mimetype] || (metadata.pages ?? 1) !== 1
      || !metadata.width || !metadata.height || metadata.width > 4096 || metadata.height > 4096
      || metadata.width < 100 || metadata.height < 100) throw new Error('dimensions');
    const { data, info } = await image.rotate().webp({ quality: 92 }).toBuffer({ resolveWithObject: true });
    if (data.length > 5 * 1024 * 1024) throw new Error('size');
    return { data, mimeType: 'image/webp', width: info.width, height: info.height };
  } catch {
    throw createError('התמונה אינה תקינה. נדרשת תמונה סטטית, 100–4096 פיקסלים ועד 16 מיליון פיקסלים', 400);
  }
}