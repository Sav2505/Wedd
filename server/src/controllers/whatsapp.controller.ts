import { Request, Response } from 'express';
import { sendTestMessage } from '../services/whatsapp.service';

export async function sendWhatsappTest(req: Request, res: Response) {
    try {
        const { to } = req.body;

        if (!to) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required",
            });
        }

        const result = await sendTestMessage(to);

        res.json({
            success: true,
            data: result,
        });
    } catch (err: any) {
        console.error(err?.raw || err);

        res.status(err?.statusCode ?? 500).json({
            success: false,
            message: err?.message ?? 'שגיאה בשליחת הודעת WhatsApp',
        });
    }
}