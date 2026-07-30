import { Request, Response } from 'express';
import { sendGuestInvitation } from '../services/whatsapp.service';

export async function sendWhatsappTest(req: Request, res: Response) {
    try {
        const { guestId, weddingId } = req.body;

        if (!guestId) {
            return res.status(400).json({
                success: false,
                message: 'guestId is required',
            });
        }

        if (!weddingId) {
            return res.status(400).json({
                success: false,
                message: 'weddingId is required',
            });
        }

        const result = await sendGuestInvitation(guestId, Number(weddingId));

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