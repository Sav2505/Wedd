import api from './api';
import {
  ApiResponse,
  OpenWeddingResponse,
  SendFirstContactResponse,
  WeddingRequest,
} from '../types/domain';

export async function listWeddingRequests(): Promise<WeddingRequest[]> {
  const { data } = await api.get<ApiResponse<WeddingRequest[]>>('/wedding-requests');

  if (!data.success || !data.data) {
    throw new Error(data.message ?? 'שגיאה בטעינת בקשות הרשמה');
  }

  return data.data;
}

export async function sendFirstContactMail(requestId: number): Promise<SendFirstContactResponse> {
  const { data } = await api.post<ApiResponse<SendFirstContactResponse>>(
    `/wedding-requests/${requestId}/send-first-contact`,
    {},
  );

  if (!data.success || !data.data) {
    throw new Error(data.message ?? 'שגיאה בשליחת מייל ראשוני');
  }

  return data.data;
}

export async function openWedding(requestId: number, note?: string): Promise<OpenWeddingResponse> {
  const { data } = await api.post<ApiResponse<OpenWeddingResponse>>(
    `/wedding-requests/${requestId}/open-wedding`,
    { note },
  );

  if (!data.success || !data.data) {
    throw new Error(data.message ?? 'שגיאה בפתיחת החתונה');
  }

  return data.data;
}
