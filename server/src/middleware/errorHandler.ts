import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err.statusCode ?? 500;
  const message =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'שגיאת שרת פנימית'
      : err.message || 'שגיאה לא צפויה';

  const route = typeof req.route?.path === 'string' ? req.route.path : 'unknown';
  console.error(`[ERROR] ${statusCode} — ${err.message} (${req.method} ${route})`);
  res.status(statusCode).json({ success: false, message });
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ success: false, message: 'הנתיב לא נמצא' });
}

export function createError(message: string, statusCode: number): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  return err;
}
