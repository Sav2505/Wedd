import { Router } from 'express';
import * as controller from '../controllers/weddingRequest.controller';
import { requireCouple } from '../middleware/requireCouple';

const router = Router();

router.post('/', controller.create);
router.get('/', requireCouple, controller.list);
router.post('/:id/send-first-contact', requireCouple, controller.sendFirstContact);
router.post('/:id/open-wedding', requireCouple, controller.openWedding);
router.post('/:id/notify-admin', controller.notifyAdmin);

export default router;