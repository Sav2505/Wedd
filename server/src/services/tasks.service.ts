import { pool } from '../db/pool';
import { WeddingTask, TaskCategory, TaskStatus } from '../types';

export interface TaskCreateInput {
  wedding_id: number;
  task_name: string;
  supplier_name?: string | null;
  category: TaskCategory;
  status: TaskStatus;
  deposit?: number;
  paid_amount?: number;
  total_amount?: number;
  price_per_plate?: number | null;
  min_commitment?: number | null;
  due_date?: string | null;
  phone?: string | null;
  website?: string | null;
  notes?: string | null;
}

export type TaskUpdateInput = Partial<TaskCreateInput>;

export async function listTasks(weddingId: number): Promise<WeddingTask[]> {
  const { rows } = await pool.query<WeddingTask>(
    `SELECT * FROM wedding_tasks WHERE wedding_id = ${weddingId} ORDER BY created_at DESC`,
  );
  return rows;
}

export async function getTaskById(id: string): Promise<WeddingTask | null> {
  const { rows } = await pool.query<WeddingTask>(
    `SELECT * FROM wedding_tasks WHERE id = $1 LIMIT 1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function createTask(data: TaskCreateInput, coupleId: string): Promise<WeddingTask> {
  const { rows } = await pool.query<WeddingTask>(
    `INSERT INTO wedding_tasks
       (wedding_id, task_name, supplier_name, category, status, deposit, paid_amount, total_amount,
        price_per_plate, min_commitment, due_date, phone, website, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    [
      data.wedding_id,
      data.task_name,
      data.supplier_name ?? null,
      data.category,
      data.status,
      data.deposit ?? 0,
      data.paid_amount ?? 0,
      data.total_amount ?? 0,
      data.price_per_plate ?? null,
      data.min_commitment ?? null,
      data.due_date ?? null,
      data.phone ?? null,
      data.website ?? null,
      data.notes ?? null,
      coupleId,
    ],
  );
  return rows[0];
}

export async function updateTask(id: string, data: TaskUpdateInput): Promise<WeddingTask | null> {
  const allowed: Array<keyof TaskUpdateInput> = [
    'task_name', 'supplier_name', 'category', 'status',
    'deposit', 'paid_amount', 'total_amount',
    'price_per_plate', 'min_commitment',
    'due_date', 'phone', 'website', 'notes',
  ];

  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const key of allowed) {
    if (key in data && data[key] !== undefined) {
      sets.push(`${key} = $${idx++}`);
      values.push(data[key]);
    }
  }

  if (sets.length === 0) return getTaskById(id);

  sets.push(`updated_at = NOW()`);
  values.push(id);

  const { rows } = await pool.query<WeddingTask>(
    `UPDATE wedding_tasks SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    values,
  );
  return rows[0] ?? null;
}

export async function deleteTask(id: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM wedding_tasks WHERE id = $1`,
    [id],
  );
  return (rowCount ?? 0) > 0;
}
