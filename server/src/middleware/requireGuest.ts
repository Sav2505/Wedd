import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/pool';
import { createError } from './errorHandler';

/**
 * Middleware: verifies the X-Guest-ID header belongs to a real guest (any role).
 * Attaches req.guestId for downstream use — identity cannot be forged via body.
 */
export async function requireGuest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const guestId = req.headers['x-guest-id'] as string | undefined;

  if (!guestId) {
    return next(createError('נדרשת הזדהות', 401));
  }

  try {
    const { rows } = await pool.query(
      'SELECT id FROM guests WHERE id = $1 LIMIT 1',
      [guestId],
    );

    if (rows.length === 0) {
      return next(createError('משתמש לא מזוהה', 401));
    }

    (req as Request & { guestId: string }).guestId = guestId;
    next();
  } catch (err) {
    next(err);
  }
}
