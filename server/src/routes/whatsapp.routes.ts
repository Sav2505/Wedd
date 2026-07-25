import { Router } from 'express';
import { sendWhatsappTest } from '../controllers/whatsapp.controller';

const router = Router();

router.get('/test', sendWhatsappTest);

export default router;