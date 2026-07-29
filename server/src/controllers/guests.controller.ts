import { Request, Response, NextFunction } from 'express';
import { createError } from '../middleware/errorHandler';
import * as guestsService from '../services/guests.service';
import { RsvpStatus } from '../types';

const RSVP_MAX_GUESTS = Number(process.env.RSVP_MAX_GUESTS ?? 10);

export async function getGuestGroups(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const weddingId = Number(req.query.wedding_id);

    if (!weddingId) {
      return next(createError('חסר מזהה חתונה', 400));
    }

    const groups = await guestsService.listGuestGroups(weddingId);

    res.json({ success: true, data: groups });
  } catch (err) {
    next(err);
  }
}

export async function createGuestGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, wedding_id } = req.body as { name?: string, wedding_id: number };
    if (!name) return next(createError('שם קבוצה הוא שדה חובה', 400));

    const group = await guestsService.createGuestGroup(name, wedding_id);
    res.status(201).json({ success: true, data: group });
  } catch (err) {
    next(err);
  }
}

export async function updateGuestGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name } = req.body as { name?: string };
    if (!name) return next(createError('שם קבוצה הוא שדה חובה', 400));

    const group = await guestsService.updateGuestGroup(req.params.id, name);
    res.json({ success: true, data: group });
  } catch (err) {
    next(err);
  }
}

export async function deleteGuestGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await guestsService.deleteGuestGroup(req.params.id);
    res.json({ success: true, message: 'הקבוצה נמחקה' });
  } catch (err) {
    next(err);
  }
}

export async function getGuests(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const weddingId = Number(req.query.wedding_id);
  
    if (!weddingId) {
      return next(createError('חסר מזהה חתונה', 400));
    }

    const query = typeof req.query.q === 'string'
      ? req.query.q
      : undefined;

    const guests = await guestsService.listGuests(
      weddingId,
      query,
    );

    res.json({ success: true, data: guests });
  } catch (err) {
    next(err);
  }
}

export async function createGuest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload = req.body as {
      wedding_id: number;
      first_name?: string;
      last_name?: string;
      phone?: string;
      side?: 'חתן' | 'כלה' | 'שניהם' | null;
      guest_group_id?: string | null;
      plus_count?: number;
      gift_amount?: number | null;
    };

    if (!payload.first_name || !payload.last_name || !payload.phone) {
      return next(createError('שם פרטי, שם משפחה וטלפון הם שדות חובה', 400));
    }

    const guest = await guestsService.createGuest({
      wedding_id: payload.wedding_id,
      first_name: payload.first_name,
      last_name: payload.last_name,
      phone: payload.phone,
      side: payload.side ?? null,
      guest_group_id: payload.guest_group_id ?? null,
      plus_count: payload.plus_count ?? 0,
      gift_amount: payload.gift_amount ?? null,
    });

    res.status(201).json({ success: true, data: guest });
  } catch (err) {
    next(err);
  }
}

export async function updateGuest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload = req.body as {
      first_name?: string;
      last_name?: string;
      phone?: string;
      side?: 'חתן' | 'כלה' | 'שניהם' | null;
      guest_group_id?: string | null;
      plus_count?: number;
      gift_amount?: number | null;
    };

    const guest = await guestsService.updateGuest(req.params.id, payload);
    res.json({ success: true, data: guest });
  } catch (err) {
    next(err);
  }
}

export async function deleteGuest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await guestsService.deleteGuest(req.params.id);
    res.json({ success: true, message: 'האורח נמחק' });
  } catch (err) {
    next(err);
  }
}

export async function getMyRsvp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const guestId = (req as Request & { guestId: string }).guestId;
    const rsvp = await guestsService.getGuestRsvpById(guestId);
    res.json({ success: true, data: rsvp });
  } catch (err) {
    next(err);
  }
}

export async function updateMyRsvp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const guestId = (req as Request & { guestId: string }).guestId;
    const payload = req.body as {
      rsvp_status?: RsvpStatus;
      number_of_guests?: number;
    };

    const status = payload.rsvp_status;
    if (!status || !['PENDING', 'COMING', 'NOT_COMING'].includes(status)) {
      return next(createError('סטטוס אישור הגעה לא תקין', 400));
    }

    const count = Number(payload.number_of_guests ?? 1);
    if (!Number.isInteger(count) || count < 1 || count > RSVP_MAX_GUESTS) {
      return next(createError(`מספר משתתפים חייב להיות בין 1 ל-${RSVP_MAX_GUESTS}`, 400));
    }

    const updated = await guestsService.updateGuestRsvpById(guestId, {
      rsvp_status: status,
      number_of_guests: count,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}
