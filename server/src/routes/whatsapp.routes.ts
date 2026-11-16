import { Router } from 'express';
import { sendWhatsappTemplate, sendWhatsappTest } from '../controllers/whatsapp.controller';
import { handleWhatsappWebhook, verifyWhatsappWebhook } from '../controllers/whatsappWebhook.controller';
import { requireCouple } from '../middleware/requireCouple';

const router = Router();

router.post('/send', requireCouple, sendWhatsappTest);
router.post('/send-template', requireCouple, sendWhatsappTemplate);
router.get('/webhook', verifyWhatsappWebhook);
router.post('/webhook', handleWhatsappWebhook);

export default router;