import { Request, Response, NextFunction } from 'express';
import * as tablesService from '../services/tables.service';
import { createError } from '../middleware/errorHandler';

export async function getTables(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tables = await tablesService.getAllTables();
    res.json({ success: true, data: tables });
  } catch (err) { next(err); }
}

export async function createTable(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { table_number, label, capacity, pos_x, pos_y, shape, orientation } = req.body as {       
      table_number: number; label?: string; capacity?: number; pos_x?: number; pos_y?: number;
      shape?: 'round' | 'square' | 'rect'; orientation?: 'h' | 'v';
    };
    if (!table_number || isNaN(Number(table_number))) {
      return next(createError('מספר שולחן הוא שדה חובה', 400));
    }
    const safeShape: 'round' | 'square' | 'rect' =
      shape === 'square' ? 'square' : shape === 'rect' ? 'rect' : 'round';
    const safeOrientation: 'h' | 'v' | null =
      safeShape === 'rect' ? (orientation === 'v' ? 'v' : 'h') : null;
    const table = await tablesService.createTable(
      Number(table_number),
      label ?? null,
      Number(capacity ?? 10),
      Number(pos_x ?? 50),
      Number(pos_y ?? 50),
      safeShape,
      safeOrientation,
    );
    res.status(201).json({ success: true, data: table });
  } catch (err) { next(err); }
}

export async function updateTable(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const updated = await tablesService.updateTable(id, req.body as Parameters<typeof tablesService.updateTable>[1]);
    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
}

export async function deleteTable(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await tablesService.deleteTable(req.params.id);
    res.json({ success: true, message: 'השולחן נמחק' });
  } catch (err) { next(err); }
}

export async function assignGuest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { guestId } = req.body as { guestId: string };
    if (!guestId) return next(createError('guestId הוא שדה חובה', 400));
    // Get table_number from id
    const tables = await tablesService.getAllTables();
    const table = tables.find(t => t.id === id);
    if (!table) return next(createError('שולחן לא נמצא', 404));
    await tablesService.assignGuest(guestId, table.table_number);
    res.json({ success: true, message: 'האורח הוסב לשולחן' });
  } catch (err) { next(err); }
}

export async function unassignGuest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { guestId } = req.params;
    await tablesService.unassignGuest(guestId);
    res.json({ success: true, message: 'האורח הוסר מהשולחן' });
  } catch (err) { next(err); }
}

export async function getUnassigned(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const guests = await tablesService.getUnassignedGuests();
    res.json({ success: true, data: guests });
  } catch (err) { next(err); }
}
