// src/routes/mailer.routes.ts
import { Router } from 'express';
import { sendEmailController } from '../controllers/mailer.controller';

const router = Router();

router.post('/send-email', sendEmailController);

export default router;