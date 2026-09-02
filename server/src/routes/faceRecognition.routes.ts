import { Router } from 'express';
import { requireGuest } from '../middleware/requireGuest';
import {
  clearWeddingFaceData,
  getScannedPhotos,
  getWeddingFaceClusters,
  saveWeddingFaceScan,
} from '../controllers/faceRecognition.controller';

const router = Router();

router.get('/scanned', requireGuest, getScannedPhotos);
router.get('/clusters', requireGuest, getWeddingFaceClusters);
router.post('/scan-results', requireGuest, saveWeddingFaceScan);
router.delete('/wedding/:weddingId', requireGuest, clearWeddingFaceData);

export default router;
