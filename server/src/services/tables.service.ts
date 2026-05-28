import { pool } from '../db/pool';
import { Guest, WeddingTable, WeddingTableWithGuests } from '../types';
import { createError } from '../middleware/errorHandler';

// ─── Get all tables (with assigned guests) ───────────────────

export async function getAllTables(): Promise<WeddingTableWithGuests[]> {
  const { rows } = await pool.query<WeddingTableWithGuests>(`
    SELECT
      t.id, t.table_number, t.label, t.capacity,
      t.pos_x, t.pos_y, t.shape, t.orientation, t.created_at,
      COALESCE(
        json_agg(
          json_build_object('id', g.id, 'full_name', g.full_name, 'side', g.side)
          ORDER BY g.full_name
        ) FILTER (WHERE g.id IS NOT NULL), '[]'
      ) AS guests
    FROM tables t
    LEFT JOIN guests g ON g.table_number = t.table_number AND g.role = 'guest'
    GROUP BY t.id
    ORDER BY t.table_number
  `);
  return rows;
}

// ─── Create table ────────────────────────────────────────────

export async function createTable(
  tableNumber: number,
  label: string | null,
  capacity: number,
  posX: number,
  posY: number,
  shape: 'round' | 'square' | 'rect' = 'round',
  orientation: 'h' | 'v' | null = null,
): Promise<WeddingTableWithGuests> {
  const { rows } = await pool.query<WeddingTable>(`
    INSERT INTO tables (table_number, label, capacity, pos_x, pos_y, shape, orientation)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `, [tableNumber, label, capacity, posX, posY, shape, orientation]);
  return { ...rows[0], guests: [] };
}

// ─── Update table metadata ───────────────────────────────────

export async function updateTable(
  id: string,
  data: {
    label?: string | null;
    capacity?: number;
    table_number?: number;
    pos_x?: number;
    pos_y?: number;
    shape?: 'round' | 'square' | 'rect';
    orientation?: 'h' | 'v' | null;
  },
): Promise<WeddingTable> {
  const allowed = ['label', 'capacity', 'table_number', 'pos_x', 'pos_y', 'shape', 'orientation'] as const;
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  // If changing table_number, verify new number isn't taken
  if (data.table_number !== undefined) {
    const { rows: old } = await pool.query<{ table_number: number }>(
      'SELECT table_number FROM tables WHERE id = $1', [id],
    );
    if (old.length === 0) throw createError('שולחן לא נמצא', 404);
    const oldNum = old[0].table_number;

    if (oldNum !== data.table_number) {
      // Re-assign guests to new number
      await pool.query(
        'UPDATE guests SET table_number = $1 WHERE table_number = $2 AND role = $3',
        [data.table_number, oldNum, 'guest'],
      );
    }
  }

  for (const key of allowed) {
    if (key in data && data[key] !== undefined) {
      sets.push(`${key} = $${idx++}`);
      values.push(data[key]);
    }
  }

  if (sets.length === 0) throw new Error('אין שדות לעדכון');
  values.push(id);

  const { rows } = await pool.query<WeddingTable>(
    `UPDATE tables SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    values,
  );
  if (rows.length === 0) throw createError('שולחן לא נמצא', 404);
  return rows[0];
}

// ─── Delete table ─────────────────────────────────────────────

export async function deleteTable(id: string): Promise<void> {
  const { rows } = await pool.query<{ table_number: number }>(
    'SELECT table_number FROM tables WHERE id = $1', [id],
  );
  if (rows.length > 0) {
    await pool.query(
      'UPDATE guests SET table_number = NULL WHERE table_number = $1 AND role = $2',
      [rows[0].table_number, 'guest'],
    );
  }
  await pool.query('DELETE FROM tables WHERE id = $1', [id]);
}

// ─── Assign / unassign guests ────────────────────────────────

export async function assignGuest(guestId: string, tableNumber: number): Promise<void> {
  // Verify guest exists
  const { rows } = await pool.query<{ id: string }>(
    "SELECT id FROM guests WHERE id = $1 AND role = 'guest'", [guestId],
  );
  if (rows.length === 0) throw createError('אורח לא נמצא', 404);
  await pool.query('UPDATE guests SET table_number = $1 WHERE id = $2', [tableNumber, guestId]);
}

export async function unassignGuest(guestId: string): Promise<void> {
  await pool.query('UPDATE guests SET table_number = NULL WHERE id = $1', [guestId]);
}

// ─── Unassigned guests list ────────────────────────────────────

export async function getUnassignedGuests(): Promise<Pick<Guest, 'id' | 'full_name' | 'side'>[]> {
  const { rows } = await pool.query<Pick<Guest, 'id' | 'full_name' | 'side'>>(
    "SELECT id, full_name, side FROM guests WHERE table_number IS NULL AND role = 'guest' ORDER BY full_name",
  );
  return rows;
}
