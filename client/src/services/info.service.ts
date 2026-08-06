import api from './api';
import { ApiResponse, WeddingInfo } from '../types/domain';

export async function getWeddingInfo(weddingId: number): Promise<WeddingInfo> {
  if (!weddingId) {
    throw new Error('Wedding ID is required to fetch wedding info');
  }

  const { data } = await api.get<ApiResponse<WeddingInfo>>(
    `/info?weddingId=${weddingId}`,
  );

  if (!data.success || !data.data) {
    throw new Error(data.message ?? 'שגיאה בטעינת פרטי החתונה');
  }

  return data.data;
}

export type WeddingInfoUpdate = Partial<
  Pick<
    WeddingInfo,
    | 'bride_name'
    | 'groom_name'
    | 'wedding_date'
    | 'wedding_time'
    | 'wedding_canpoy_time'
    | 'venue_name'
    | 'venue_address'
    | 'venue_lat'
    | 'venue_lng'
    | 'dress_code'
    | 'notes'
    | 'message'
    | 'stage_label'
    | 'is_tables_published'
    | 'whatsapp_owner_confirmed'
    | 'table_scale_factor'
    | 'bride_bit_url'
    | 'groom_bit_url'
  >
>;

export async function updateWeddingInfo(
  payload: WeddingInfoUpdate,
  weddingId: number,
): Promise<WeddingInfo> {
  if (!weddingId) {
    throw new Error('Wedding ID is required to update wedding info');
  }

  const { data } = await api.put<ApiResponse<WeddingInfo>>('/info', {
    ...payload,
    wedding_id: weddingId,
  });

  if (!data.success || !data.data) {
    throw new Error(data.message ?? 'שגיאה בשמירת פרטי החתונה');
  }

  return data.data;
}

export async function uploadHeroImage(file: File, weddingId: number): Promise<WeddingInfo> {
  const formData = new FormData();
  formData.append('hero', file);
  formData.append('wedding_id', String(weddingId));

  const { data } = await api.post<ApiResponse<WeddingInfo>>('/info/hero', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  if (!data.success || !data.data) {
    throw new Error(data.message ?? 'שגיאה בהעלאת התמונה');
  }

  return data.data;
}

export async function updatePublishTables(
  isPublishedTables: boolean,
  weddingId: number,
): Promise<WeddingInfo> {
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