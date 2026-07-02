import { Request, Response, NextFunction } from 'express';
import * as tasksService from '../services/tasks.service';
import { TaskCategory, TaskStatus } from '../types';

type CoupleRequest = Request & { coupleId: string };

const VALID_CATEGORIES: TaskCategory[] = [
  'venue','photographer','dj','dress','suit','rings',
  'decorations','invitations','transportation','makeup',
  'hair','rabbi','flowers','food','alcohol','gifts',
  'design','side_event','hotel','attire','other',
];

const VALID_STATUSES: TaskStatus[] = [
  'not_started','in_progress','waiting','completed','cancelled',
];

export async function getTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tasks = await tasksService.listTasks();
    res.json({ success: true, data: tasks });
  } catch (err) { next(err); }
}

export async function getTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const task = await tasksService.getTaskById(req.params.id);
    if (!task) { res.status(404).json({ success: false, message: 'משימה לא נמצאה' }); return; }
    res.json({ success: true, data: task });
  } catch (err) { next(err); }
}

export async function createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const coupleId = (req as CoupleRequest).coupleId;
    const body = req.body as Record<string, unknown>;

    const task_name = (body.task_name as string | undefined)?.trim();
    if (!task_name) { res.status(400).json({ success: false, message: 'שם המשימה הוא שדה חובה' }); return; }

    const category = (body.category as TaskCategory | undefined) ?? 'other';
    if (!VALID_CATEGORIES.includes(category)) {
      res.status(400).json({ success: false, message: 'קטגוריה לא חוקית' }); return;
    }

    const status = (body.status as TaskStatus | undefined) ?? 'not_started';
    if (!VALID_STATUSES.includes(status)) {
      res.status(400).json({ success: false, message: 'סטטוס לא חוקי' }); return;
    }

    const deposit = Number(body.deposit ?? 0);
    const paid_amount = Number(body.paid_amount ?? 0);
    const total_amount = Number(body.total_amount ?? 0);

    if (deposit < 0 || paid_amount < 0 || total_amount < 0) {
      res.status(400).json({ success: false, message: 'סכומים לא יכולים להיות שליליים' }); return;
    }
    if (paid_amount > total_amount) {
      res.status(400).json({ success: false, message: 'סכום ששולם לא יכול לעלות על הסכום הכולל' }); return;
    }
    if (deposit > total_amount) {
      res.status(400).json({ success: false, message: 'מקדמה לא יכולה לעלות על הסכום הכולל' }); return;
    }

    const task = await tasksService.createTask({
      task_name,
      supplier_name: (body.supplier_name as string | undefined)?.trim() || null,
      category,
      status,
      deposit,
      paid_amount,
      total_amount,
      price_per_plate: body.price_per_plate != null ? Number(body.price_per_plate) : null,
      min_commitment:  body.min_commitment  != null ? Number(body.min_commitment)  : null,
      due_date: (body.due_date as string | undefined) || null,
      phone: (body.phone as string | undefined)?.trim() || null,
      website: (body.website as string | undefined)?.trim() || null,
      notes: (body.notes as string | undefined)?.trim() || null,
    }, coupleId);

    res.status(201).json({ success: true, data: task });
  } catch (err) { next(err); }
}

export async function updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;

    if ('category' in body) {
      const category = body.category as TaskCategory;
      if (!VALID_CATEGORIES.includes(category)) {
        res.status(400).json({ success: false, message: 'קטגוריה לא חוקית' }); return;
      }
    }

    if ('status' in body) {
      const status = body.status as TaskStatus;
      if (!VALID_STATUSES.includes(status)) {
        res.status(400).json({ success: false, message: 'סטטוס לא חוקי' }); return;
      }
    }

    const deposit = body.deposit !== undefined ? Number(body.deposit) : undefined;
    const paid_amount = body.paid_amount !== undefined ? Number(body.paid_amount) : undefined;
    const total_amount = body.total_amount !== undefined ? Number(body.total_amount) : undefined;

    if ((deposit !== undefined && deposit < 0) ||
        (paid_amount !== undefined && paid_amount < 0) ||
        (total_amount !== undefined && total_amount < 0)) {
      res.status(400).json({ success: false, message: 'סכומים לא יכולים להיות שליליים' }); return;
    }

    const task = await tasksService.updateTask(req.params.id, {
      ...(body.task_name !== undefined && { task_name: (body.task_name as string).trim() }),
      ...(body.supplier_name !== undefined && { supplier_name: (body.supplier_name as string)?.trim() || null }),
      ...(body.category !== undefined && { category: body.category as TaskCategory }),
      ...(body.status !== undefined && { status: body.status as TaskStatus }),
      ...(deposit !== undefined && { deposit }),
      ...(paid_amount !== undefined && { paid_amount }),
      ...(total_amount !== undefined && { total_amount }),
      ...(body.price_per_plate !== undefined && { price_per_plate: body.price_per_plate != null ? Number(body.price_per_plate) : null }),
      ...(body.min_commitment  !== undefined && { min_commitment:  body.min_commitment  != null ? Number(body.min_commitment)  : null }),
      ...(body.due_date !== undefined && { due_date: (body.due_date as string) || null }),
      ...(body.phone !== undefined && { phone: (body.phone as string)?.trim() || null }),
      ...(body.website !== undefined && { website: (body.website as string)?.trim() || null }),
      ...(body.notes !== undefined && { notes: (body.notes as string)?.trim() || null }),
    });

    if (!task) { res.status(404).json({ success: false, message: 'משימה לא נמצאה' }); return; }
    res.json({ success: true, data: task });
  } catch (err) { next(err); }
}

export async function deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const deleted = await tasksService.deleteTask(req.params.id);
    if (!deleted) { res.status(404).json({ success: false, message: 'משימה לא נמצאה' }); return; }
    res.json({ success: true });
  } catch (err) { next(err); }
}
