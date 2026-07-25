import { Request, Response } from 'express';
import { sendTestMessage } from '../services/whatsapp.service';

export async function sendWhatsappTest(req: Request, res: Response) {
    try {
        const result = await sendTestMessage("972585709899");
        res.json(result);
    } catch (err: any) {
        console.error(err.response?.data || err);
        res.status(500).json(err.response?.data || err.message);
    }
}