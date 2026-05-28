import api from './api';
import { ApiResponse, WeddingInfo } from '../types/domain';

export async function getWeddingInfo(): Promise<WeddingInfo> {
  const { data } = await api.get<ApiResponse<WeddingInfo>>('/info');
  if (!data.success || !data.data) throw new Error(data.message ?? 'שגיאה בטעינת פרטי החתונה');
  return data.data;
}

export type WeddingInfoUpdate = Partial<
  Pick<
    WeddingInfo,
    | 'bride_name' | 'groom_name' | 'wedding_date' | 'wedding_time'
    | 'venue_name' | 'venue_address' | 'venue_lat' | 'venue_lng'
    | 'dress_code' | 'notes' | 'message'
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
