import { Router } from 'express';
import { login, markToured } from '../controllers/auth.controller';
import { requireGuest } from '../middleware/requireGuest';

const router = Router();

router.post('/login', login);
router.patch('/mark-toured', requireGuest, markToured);

export default router;
