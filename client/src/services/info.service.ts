import api from './api';
import { ApiResponse, WeddingInfo } from '../types/domain';

export async function getWeddingInfo(): Promise<WeddingInfo> {
  const storedGuest = localStorage.getItem('wedding_guest');

  if (!storedGuest) {
    throw new Error('משתמש לא מחובר');
  }

  const guest = JSON.parse(storedGuest);

  const { data } = await api.get<ApiResponse<WeddingInfo>>(
    `/info?guestId=${guest.id}`,
  );

  if (!data.success || !data.data) {
    throw new Error(data.message ?? 'שגיאה בטעינת פרטי החתונה');
  }

  return data.data;
}

export type WeddingInfoUpdate = Partial<
  Pick<
    WeddingInfo,
    | 'bride_name' | 'groom_name' | 'wedding_date' | 'wedding_time' | 'wedding_canpoy_time'
    | 'venue_name' | 'venue_address' | 'venue_lat' | 'venue_lng'
    | 'dress_code' | 'notes' | 'message' | 'stage_label'
  >
>;

export async function updateWeddingInfo(payload: WeddingInfoUpdate): Promise<WeddingInfo> {
  const { data } = await api.put<ApiResponse<WeddingInfo>>('/info', payload);
  if (!data.success || !data.data) throw new Error(data.message ?? 'שגיאה בשמירת פרטי החתונה');
  return data.data;
}

export async function uploadHeroImage(file: File): Promise<WeddingInfo> {
  const formData = new FormData();
  formData.append('hero', file);
  const { data } = await api.post<ApiResponse<WeddingInfo>>('/info/hero', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  if (!data.success || !data.data) throw new Error(data.message ?? 'שגיאה בהעלאת התמונה');
  return data.data;
}

export async function updatePublishTables(isPublishedTables: boolean): Promise<WeddingInfo> {
  const weddingId = JSON.parse(localStorage.getItem('wedding_guest') || '{}')?.wedding_id;

  const { data } = await api.put<ApiResponse<WeddingInfo>>(
    '/info/update-publish-tables',
    {
      is_published_tables: isPublishedTables,
      wedding_id: weddingId,
    }
  );

  if (!data.success || !data.data) {
    throw new Error(data.message ?? 'שגיאה בעדכון מצב פרסום ההושבה');
  }

  return data.data;
}