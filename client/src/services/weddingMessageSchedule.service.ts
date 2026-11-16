import api from './api';
import { ApiResponse, WeddingMessageSchedule } from '../types/domain';

export type GroupMessageTemplate = 'wedding_confirmation' | 'wedding_reminder' | 'wedding_day_before' | 'wedding_post_thanks';

export interface GroupScheduleData {
  enabled: boolean;
  groups: Array<{ group_id: string | null; name: string; total: number; pending: number; coming: number }>;
  schedules: Array<{
    id: string;
    template_name: GroupMessageTemplate;
    guest_group_id: string | null;
    scheduled_at: string | null;
    status: 'scheduled' | 'processing' | 'paused_quota' | 'paused_schedule' | 'paused_error' | 'completed' | 'excluded';
    status_detail: string | null;
    sent_count: number;
    skipped_count: number;
    problem_count: number;
  }>;
}

export async function getGroupMessageSchedule(weddingId: number): Promise<GroupScheduleData> {
  const { data } = await api.get<ApiResponse<GroupScheduleData>>(`/weddings/${weddingId}/group-message-schedule`);
  if (!data.success || !data.data) throw new Error(data.message ?? 'שגיאה בטעינת תזמון הקבוצות');
  return data.data;
}

export async function saveGroupMessageSchedule(
  weddingId: number,
  templateName: GroupMessageTemplate,
  assignments: Array<{ groupId: string | null; excluded: boolean; localDateTime: string | null }>,
): Promise<void> {
  const { data } = await api.put<ApiResponse>(`/weddings/${weddingId}/group-message-schedule/${templateName}`, { assignments });
  if (!data.success) throw new Error(data.message ?? 'שגיאה בשמירת תזמון הקבוצות');
}

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
