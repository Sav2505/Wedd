import { Request, Response } from 'express';
import * as service from '../services/weddingRequest.service';

export async function create(req: Request, res: Response) {
    try {

        const wedding = await service.createWeddingRequest(req.body);

        res.json({
            success: true,
            data: wedding,
        });

    } catch (err) {

        res.status(500).json({
            success: false,
            message: 'שגיאה ביצירת הבקשה',
        });

    }
}