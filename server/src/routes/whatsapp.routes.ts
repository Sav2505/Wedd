import { Router } from 'express';
import { sendWhatsappTest } from '../controllers/whatsapp.controller';

const router = Router();

router.post('/send', sendWhatsappTest);

export default router;