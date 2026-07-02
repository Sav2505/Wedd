import { Router } from 'express';
import multer from 'multer';
import { getPhotos, uploadPhoto, deletePhoto, getPhotoThumb, getPhotoFull } from '../controllers/photos.controller';
import { requireGuest } from '../middleware/requireGuest';

// Store files in memory — buffers go straight to Postgres, no disk writes
const storage = multer.memoryStorage();

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('ניתן להעלות תמונות בלבד (JPEG, PNG, WEBP, GIF)'));
  }
};

// Accept two fields per photo: compressed thumbnail + full-res
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per field (already client-compressed)
});

const router = Router();

router.get('/', getPhotos);
router.get('/:id/thumb', getPhotoThumb);
router.get('/:id/full', getPhotoFull);
router.post('/', upload.fields([{ name: 'thumb', maxCount: 1 }, { name: 'full', maxCount: 1 }]), uploadPhoto);
router.delete('/:id', requireGuest, deletePhoto);

export default router;
