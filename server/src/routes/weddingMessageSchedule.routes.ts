import { Router } from 'express';
import multer from 'multer';
import { requireCouple } from '../middleware/requireCouple';
import {
  deleteInvitationImage,
  downloadInvitationImage,
  getSchedule,
  patchSchedule,
  uploadInvitationImage,
} from '../controllers/weddingMessageSchedule.controller';

const storage = multer.memoryStorage();

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('ניתן להעלות תמונות JPEG, PNG, WEBP בלבד'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const router = Router();

router.use(requireCouple);

router.get('/:weddingId/message-schedule', getSchedule);
router.patch('/:weddingId/message-schedule', patchSchedule);
router.post('/:weddingId/invitation-image', upload.single('image'), uploadInvitationImage);
router.get('/:weddingId/invitation-image', downloadInvitationImage);
router.delete('/:weddingId/invitation-image', deleteInvitationImage);

export default router;
