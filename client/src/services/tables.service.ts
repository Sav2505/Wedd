import api from './api';
import { ApiResponse, WeddingTableWithGuests } from '../types/domain';

function toFiniteNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeTable(table: WeddingTableWithGuests): WeddingTableWithGuests {
  const shape: 'round' | 'square' | 'rect' =
    table.shape === 'square' ? 'square' : table.shape === 'rect' ? 'rect' : 'round';
  return {
    ...table,
    table_number: toFiniteNumber(table.table_number, 0),
    capacity: toFiniteNumber(table.capacity, 0),
    pos_x: toFiniteNumber(table.pos_x, 50),
    pos_y: toFiniteNumber(table.pos_y, 50),
    shape,
    orientation: shape === 'rect' ? (table.orientation === 'v' ? 'v' : 'h') : null,
  };
}

export async function getAllTables(): Promise<WeddingTableWithGuests[]> {
  const { data } = await api.get<ApiResponse<WeddingTableWithGuests[]>>('/tables');
  if (!data.success || !data.data) throw new Error(data.message ?? 'שגיאה בטעינת שולחנות');
  return data.data.map(normalizeTable);
}

export async function createTable(payload: {
  table_number: number; label?: string; capacity?: number; pos_x?: number; pos_y?: number;
  shape?: 'round' | 'square' | 'rect'; orientation?: 'h' | 'v';
}): Promise<WeddingTableWithGuests> {
  const { data } = await api.post<ApiResponse<WeddingTableWithGuests>>('/tables', payload);
  if (!data.success || !data.data) throw new Error(data.message ?? 'שגיאה ביצירת שולחן');
  return normalizeTable(data.data);
}

export async function updateTable(
  id: string,
  payload: { label?: string | null; capacity?: number; table_number?: number; pos_x?: number; pos_y?: number; shape?: 'round' | 'square' | 'rect'; orientation?: 'h' | 'v' | null }, 
): Promise<void> {
  await api.put(`/tables/${id}`, payload);
}

export async function updateTablePosition(id: string, pos_x: number, pos_y: number): Promise<void> {
  await api.put(`/tables/${id}`, { pos_x, pos_y });
}

export async function deleteTable(id: string): Promise<void> {
  await api.delete(`/tables/${id}`);
}

export async function assignGuest(tableId: string, guestId: string): Promise<void> {
  await api.post(`/tables/${tableId}/assign`, { guestId });
}

export async function unassignGuest(guestId: string): Promise<void> {
  await api.delete(`/tables/guests/${guestId}`);
}

export async function getUnassignedGuests(): Promise<{ id: string; full_name: string; side: string | null }[]> {
  const { data } = await api.get<ApiResponse<{ id: string; full_name: string; side: string | null }[]>>('/tables/unassigned');
  if (!data.success || !data.data) return [];
  return data.data;
}
