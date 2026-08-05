import api from './api';
import { ApiResponse, GuestGroup, ManagedGuest, RsvpStatus } from '../types/domain';

export interface GuestRsvpDetails {
  id: string;
  rsvp_status: RsvpStatus;
  number_of_guests: number;
  rsvp_updated_at: string | null;
}

export async function getGuestGroups(weddingId: number | undefined): Promise<GuestGroup[]> {
  if (!weddingId) {
    throw new Error('לא נמצא מזהה חתונה');
  }

  const { data } = await api.get<ApiResponse<GuestGroup[]>>(
    '/guests/groups',
    {
      params: {
        wedding_id: weddingId,
      },
    },
  );

  if (!data.success || !data.data) {
    throw new Error(data.message ?? 'שגיאה בטעינת קבוצות');
  }

  return data.data;
}

export async function createGuestGroup(name: string, wedding_id: number): Promise<GuestGroup> {
  const { data } = await api.post<ApiResponse<GuestGroup>>('/guests/groups', { name, wedding_id });
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

export async function getGuests(q?: string, wedding_id?: number): Promise<ManagedGuest[]> {
  const { data } = await api.get<ApiResponse<ManagedGuest[]>>('/guests', {
    params: {
      wedding_id: wedding_id,
      ...(q?.trim() ? { q: q.trim() } : {}),
    },
  });

  if (!data.success || !data.data) {
    throw new Error(data.message ?? 'שגיאה בטעינת אורחים');
  }

  return data.data;
}

export async function createGuest(payload: {
  wedding_id: number;
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
    gift_amount?: number | null;
    gift_kind?: string | null;
  },
): Promise<ManagedGuest> {
  const { data } = await api.put<ApiResponse<ManagedGuest>>(`/guests/${id}`, payload);
  if (!data.success || !data.data) throw new Error(data.message ?? 'שגיאה בעדכון אורח');
  return data.data;
}

export async function deleteGuest(id: string): Promise<void> {
  await api.delete(`/guests/${id}`);
}

export async function getMyRsvp(): Promise<GuestRsvpDetails> {
  const { data } = await api.get<ApiResponse<GuestRsvpDetails>>('/guests/me/rsvp');
  if (!data.success || !data.data) throw new Error(data.message ?? 'שגיאה בטעינת סטטוס אישור הגעה');
  return data.data;
}

export async function updateMyRsvp(payload: {
  rsvp_status: RsvpStatus;
  number_of_guests: number;
}): Promise<GuestRsvpDetails> {
  const { data } = await api.put<ApiResponse<GuestRsvpDetails>>('/guests/me/rsvp', payload);
  if (!data.success || !data.data) throw new Error(data.message ?? 'שגיאה בשמירת אישור ההגעה');
  return data.data;
}

export async function sendWhatsappInvitation(guestId: string, weddingId: number): Promise<void> {
  const { data } = await api.post<ApiResponse<void>>('/whatsapp/send', {
    guestId,
    weddingId,
  });

  if (!data.success) {
    throw new Error(data.message ?? 'שגיאה בשליחת הודעת WhatsApp');
  }
}