import { Request, Response, NextFunction } from 'express';
import { createError } from '../middleware/errorHandler';
import * as ridesService from '../services/rides.service';
import { RideKind, RidePostInput } from '../services/rides.service';

type GuestRequest = Request & { guestId: string };

function getGuestId(req: Request): string {
  return (req as GuestRequest).guestId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, field: string, required = true): string | null {
  if (value == null && !required) return null;
  if (typeof value !== 'string') throw createError(`השדה ${field} אינו תקין`, 400);
  const trimmed = value.trim();
  if (required && !trimmed) throw createError(`השדה ${field} הוא שדה חובה`, 400);
  return trimmed || null;
}

function integer(value: unknown, field: string, required: boolean): number | null {
  if (value == null && !required) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed)) throw createError(`השדה ${field} חייב להיות מספר שלם`, 400);
  return parsed;
}

function validTime(value: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  return Boolean(match && Number(match[1]) <= 23 && Number(match[2]) <= 59);
}

function parseInput(body: unknown): RidePostInput {
  if (!isRecord(body)) throw createError('פרטי הפרסום אינם תקינים', 400);
  const kind = body.kind;
  if (kind !== 'offer' && kind !== 'request') throw createError('סוג הפרסום אינו תקין', 400);
  if (body.consent !== true) throw createError('צריך לאשר את הצגת הפרטים ויצירת הקשר', 400);

  const timeFrom = text(body.time_from, 'שעת התחלה') as string;
  const timeTo = text(body.time_to, 'שעת סיום', false);
  if (!validTime(timeFrom) || (timeTo !== null && !validTime(timeTo))) {
    throw createError('שעת היציאה אינה תקינה', 400);
  }

  const seatsAvailable = integer(body.seats_available, 'מספר המקומות', kind === 'offer');
  const passengerCount = integer(body.passenger_count, 'מספר הנוסעים', kind === 'request');
  if (kind === 'offer' && body.passenger_count != null) {
    throw createError('מספר נוסעים מתאים לבקשת טרמפ בלבד', 400);
  }
  if (kind === 'request' && body.seats_available != null) {
    throw createError('מספר מקומות מתאים להצעת נסיעה בלבד', 400);
  }

  return {
    kind: kind as RideKind,
    display_name: text(body.display_name, 'שם תצוגה') as string,
    contact_phone: text(body.contact_phone, 'טלפון WhatsApp') as string,
    origin_text: text(body.origin_text, 'אזור או נקודת איסוף') as string,
    time_from: timeFrom,
    time_to: timeTo,
    seats_available: seatsAvailable,
    passenger_count: passengerCount,
    notes: text(body.notes, 'הערות', false),
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validatePostId(id: string): void {
  if (!isUuid(id)) throw createError('מזהה הפרסום אינו תקין', 400);
}

export async function listRidePosts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await ridesService.listRidePosts(getGuestId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createRidePost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await ridesService.createRidePost(getGuestId(req), parseInput(req.body));
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function updateRidePost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    validatePostId(req.params.id);
    const data = await ridesService.updateRidePost(getGuestId(req), req.params.id, parseInput(req.body));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function updateRidePostStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    validatePostId(req.params.id);
    if (!isRecord(req.body) || (req.body.status !== 'full' && req.body.status !== 'closed')) {
      throw createError('סטטוס הפרסום אינו תקין', 400);
    }
    const data = await ridesService.updateRidePostStatus(
      getGuestId(req),
      req.params.id,
      req.body.status,
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function deleteRidePost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    validatePostId(req.params.id);
    await ridesService.deleteRidePost(getGuestId(req), req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}