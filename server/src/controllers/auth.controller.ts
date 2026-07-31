import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from '../services/auth.service';
import { createError } from '../middleware/errorHandler';

const loginSchema = z.object({
  fullName: z.string().min(2, 'שם מלא חייב להכיל לפחות 2 תווים').max(100),
  lastFourDigits: z
    .string()
    .length(4, '4 ספרות בלבד')
    .regex(/^\d{4}$/, 'יש להזין 4 ספרות בלבד'),
  weddingId: z.string().optional(),
});

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(', ');
      return next(createError(message, 400));
    }

    const { fullName, lastFourDigits, weddingId } = parsed.data;
    const numericWeddingId = weddingId ? Number(weddingId) : undefined;

    let guest;

    if (numericWeddingId != null) {
      // Wedding-scoped login: try guest first, then couple - both filtered by weddingId.
      guest = await authService.loginGuest(fullName, lastFourDigits, numericWeddingId);
    } else {
      // No weddingId available (manual entry on the generic /login page).
      // This path is effectively couple-only in practice, but we still
      // fall back to a global guest search inside the service for safety.
      guest = await authService.loginGroomOrBride(fullName, lastFourDigits);
    }

    res.status(200).json({ success: true, data: { guest } });
  } catch (err) {
    next(err);
  }
}