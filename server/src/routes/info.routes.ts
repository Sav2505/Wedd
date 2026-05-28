import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getInfo, updateInfo, uploadHero } from '../controllers/info.controller';
import { requireCouple } from '../middleware/requireCouple';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? 'uploads';

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `hero-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  allowed.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error('ניתן להעלות תמונות JPEG, PNG, WEBP בלבד'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 15 * 1024 * 1024 } });

const router = Router();

router.get('/',              getInfo);
router.put('/',              requireCouple, updateInfo);
router.post('/hero',         requireCouple, upload.single('hero'), uploadHero);

export default router;
