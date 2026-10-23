import { Router } from 'express';
import * as controller from '../controllers/guestCustomMessage.controller';
import { requireCouple } from '../middleware/requireCouple';

const router = Router();
router.use(requireCouple);

router.get('/:weddingId/custom-message-requests', controller.listMine);
router.post('/:weddingId/custom-message-requests', controller.create);

export default router;