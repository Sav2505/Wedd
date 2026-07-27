import api from './api';
import { ApiResponse, WeddingMessageSchedule } from '../types/domain';

export async function getWeddingMessageSchedule(weddingId: number): Promise<WeddingMessageSchedule> {
  const { data } = await api.get<ApiResponse<WeddingMessageSchedule>>(`/weddings/${weddingId}/message-schedule`);
  if (!data.success || !data.data) throw new Error(data.message ?? 'שגיאה בטעינת הגדרות תזמון');
  return data.data;
}

export async function patchWeddingMessageSchedule(
  weddingId: number,
  payload: Partial<Pick<WeddingMessageSchedule, 'invitation_days_before' | 'reminder_days_before' | 'day_before_offset_days'>>,
): Promise<WeddingMessageSchedule> {
  const { data } = await api.patch<ApiResponse<WeddingMessageSchedule>>(`/weddings/${weddingId}/message-schedule`, payload);
  if (!data.success || !data.data) throw new Error(data.message ?? 'שגיאה בשמירת הגדרות תזמון');
  return data.data;
}

export async function uploadWeddingInvitationImage(weddingId: number, file: File): Promise<WeddingMessageSchedule> {
  const formData = new FormData();
  formData.append('image', file);

  const { data } = await api.post<ApiResponse<WeddingMessageSchedule>>(
    `/weddings/${weddingId}/invitation-image`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );

  if (!data.success || !data.data) throw new Error(data.message ?? 'שגיאה בהעלאת תמונת ההזמנה');
  return data.data;
}

export async function deleteWeddingInvitationImage(weddingId: number): Promise<WeddingMessageSchedule> {
  const { data } = await api.delete<ApiResponse<WeddingMessageSchedule>>(`/weddings/${weddingId}/invitation-image`);
  if (!data.success || !data.data) throw new Error(data.message ?? 'שגיאה במחיקת תמונת ההזמנה');
  return data.data;
}

export async function fetchWeddingInvitationImageBlob(weddingId: number): Promise<Blob | null> {
  try {
    const { data } = await api.get<Blob>(`/weddings/${weddingId}/invitation-image`, {
      responseType: 'blob',
    });
    return data;
  } catch {
    return null;
  }
}
