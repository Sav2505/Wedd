import { Request, Response, NextFunction } from 'express';
import { createError } from '../middleware/errorHandler';
import * as guestsService from '../services/guests.service';

export async function getGuestGroups(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const groups = await guestsService.listGuestGroups();
    res.json({ success: true, data: groups });
  } catch (err) {
    next(err);
  }
}

export async function createGuestGroup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name } = req.body as { name?: string };
    if (!name) return next(createError('שם קבוצה הוא שדה חובה', 400));

    const group = await guestsService.createGuestGroup(name);
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

export async function getGuests(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q : undefined;
    const guests = await guestsService.listGuests(query);
    res.json({ success: true, data: guests });
  } catch (err) {
    next(err);
  }
}

export async function createGuest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const payload = req.body as {
      first_name?: string;
      last_name?: string;
      phone?: string;
      side?: 'חתן' | 'כלה' | 'שניהם' | null;
      guest_group_id?: string | null;
      plus_count?: number;
    };

    if (!payload.first_name || !payload.last_name || !payload.phone) {
      return next(createError('שם פרטי, שם משפחה וטלפון הם שדות חובה', 400));
    }

    const guest = await guestsService.createGuest({
      first_name: payload.first_name,
      last_name: payload.last_name,
      phone: payload.phone,
      side: payload.side ?? null,
      guest_group_id: payload.guest_group_id ?? null,
      plus_count: payload.plus_count ?? 0,
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
