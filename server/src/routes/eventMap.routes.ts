import { Router } from 'express';
import multer from 'multer';
import { mapHandler } from '../controllers/eventMap.controller';
import { requireCouple } from '../middleware/requireCouple';
import { requireGuest } from '../middleware/requireGuest';
import { createError } from '../middleware/errorHandler';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 1, fieldSize: 256 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) callback(null, true);
    else callback(createError('ניתן להעלות JPEG, PNG או WebP בלבד', 400));
  },
});
const router = Router();
router.get('/draft', requireCouple, mapHandler('draft'));
router.get('/published', requireGuest, mapHandler('published'));
router.get('/draft/background', requireCouple, mapHandler('draftImage'));
router.get('/published/background', requireGuest, mapHandler('publishedImage'));
router.put('/draft', requireCouple, (req, res, next) => {
  upload.single('background')(req, res, error => {
    if (error instanceof multer.MulterError) {
      const messages: Record<string, string> = {
        LIMIT_FILE_SIZE: 'תמונת הרקע גדולה מדי. ניתן להעלות קובץ עד 5MB',
        LIMIT_FIELD_VALUE: 'מסמך המפה גדול מדי. הגודל המרבי הוא 256KB',
        LIMIT_FILE_COUNT: 'ניתן להעלות תמונת רקע אחת בלבד',
        LIMIT_FIELD_COUNT: 'יש לשלוח רק שדה אחד של מסמך המפה',
        LIMIT_UNEXPECTED_FILE: 'שדה קובץ לא תקין. יש לשלוח תמונת רקע אחת בשדה background',
      };
      const status = error.code === 'LIMIT_FILE_SIZE' || error.code === 'LIMIT_FIELD_VALUE' ? 413 : 400;
      return next(createError(messages[error.code] ?? 'בקשת העלאת המפה אינה תקינה', status));
    }
    next(error);
  });
}, mapHandler('save'));
router.post('/publish', requireCouple, mapHandler('publish'));
router.post('/unpublish', requireCouple, mapHandler('unpublish'));
export default router;