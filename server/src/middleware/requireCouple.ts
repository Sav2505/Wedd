import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/pool';
import { createError } from './errorHandler';

/**
 * Middleware: verifies the X-Guest-ID header belongs to a couple-role user.
 * Attaches req.coupleId for downstream use.
 */
export async function requireCouple(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const guestId = req.headers['x-guest-id'] as string | undefined;

  if (!guestId) {
    return next(createError('נדרשת הזדהות זוגית', 401));
  }

  try {
    const { rows } = await pool.query(
      "SELECT id FROM guests WHERE id = $1 AND role = 'couple' LIMIT 1",
      [guestId],
    );

    if (rows.length === 0) {
      return next(createError('אין הרשאה — גישה לחתן/כלה בלבד', 403));
    }

    (req as Request & { coupleId: string }).coupleId = guestId;
    next();
  } catch (err) {
    next(err);
  }
}
