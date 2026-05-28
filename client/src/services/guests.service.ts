import api from './api';
import { ApiResponse, GuestGroup, ManagedGuest } from '../types/domain';

export async function getGuestGroups(): Promise<GuestGroup[]> {
  const { data } = await api.get<ApiResponse<GuestGroup[]>>('/guests/groups');
  if (!data.success || !data.data) throw new Error(data.message ?? 'שגיאה בטעינת קבוצות');
  return data.data;
}

export async function createGuestGroup(name: string): Promise<GuestGroup> {
  const { data } = await api.post<ApiResponse<GuestGroup>>('/guests/groups', { name });
  if (!data.success || !data.data) throw new Error(data.message ?? 'שגיאה ביצירת קבוצה');
  return data.data;
}

export async function updateGuestGroup(id: string, name: string): Promise<GuestGroup> {
  const { data } = await api.put<ApiResponse<GuestGroup>>(`/guests/groups/${id}`, { name });
  if (!data.success || !data.data) throw new Error(data.message ?? 'שגיאה בעדכון קבוצה');
  return data.data;
}

export async function deleteGuestGroup(id: string): Promise<void> {
  await api.delete(`/guests/groups/${id}`);
}

export async function getGuests(q?: string): Promise<ManagedGuest[]> {
  const { data } = await api.get<ApiResponse<ManagedGuest[]>>('/guests', {
    params: q?.trim() ? { q: q.trim() } : undefined,
  });
  if (!data.success || !data.data) throw new Error(data.message ?? 'שגיאה בטעינת אורחים');
  return data.data;
}

export async function createGuest(payload: {
  first_name: string;
  last_name: string;
  phone: string;
  side?: 'חתן' | 'כלה' | 'שניהם' | null;
  guest_group_id?: string | null;
  plus_count?: number;
}): Promise<ManagedGuest> {
  const { data } = await api.post<ApiResponse<ManagedGuest>>('/guests', payload);
  if (!data.success || !data.data) throw new Error(data.message ?? 'שגיאה ביצירת אורח');
  return data.data;
}

export async function updateGuest(
  id: string,
  payload: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    side?: 'חתן' | 'כלה' | 'שניהם' | null;
    guest_group_id?: string | null;
    plus_count?: number;
  },
): Promise<ManagedGuest> {
  const { data } = await api.put<ApiResponse<ManagedGuest>>(`/guests/${id}`, payload);
  if (!data.success || !data.data) throw new Error(data.message ?? 'שגיאה בעדכון אורח');
  return data.data;
}

export async function deleteGuest(id: string): Promise<void> {
  await api.delete(`/guests/${id}`);
}
