import api from './api';
import {
  ApiResponse,
  GuestCustomMessageAudience,
  GuestCustomMessageRequest,
} from '../types/domain';

interface CreateResponse {
  request: GuestCustomMessageRequest;
  admin_notification_sent: boolean;
}

interface ReviewResponse {
  request: GuestCustomMessageRequest;
  couple_notification_sent: boolean;
}

export async function listMyGuestCustomMessages(weddingId: number): Promise<GuestCustomMessageRequest[]> {
  const { data } = await api.get<ApiResponse<GuestCustomMessageRequest[]>>(
    `/weddings/${weddingId}/custom-message-requests`,
  );
  if (!data.success || !data.data) throw new Error(data.message ?? 'טעינת בקשות ההודעות נכשלה');
  return data.data;
}

export async function createGuestCustomMessage(input: {
  weddingId: number;
  audience: GuestCustomMessageAudience;
  message_body: string;
  scheduled_at: string;
}): Promise<CreateResponse> {
  const { data } = await api.post<ApiResponse<CreateResponse>>(
    `/weddings/${input.weddingId}/custom-message-requests`,
    {
      audience: input.audience,
      message_body: input.message_body,
      scheduled_at: input.scheduled_at,
    },
  );
  if (!data.success || !data.data) throw new Error(data.message ?? 'שליחת הבקשה נכשלה');
  return data.data;
}

export async function listAdminGuestCustomMessages(): Promise<GuestCustomMessageRequest[]> {
  const { data } = await api.get<ApiResponse<GuestCustomMessageRequest[]>>(
    '/wedding-requests/guest-custom-messages',
  );
  if (!data.success || !data.data) throw new Error(data.message ?? 'טעינת בקשות הודעות נכשלה');
  return data.data;
}

export async function reviewGuestCustomMessage(
  id: string,
  decision: 'approved' | 'rejected',
  note?: string,
): Promise<ReviewResponse> {
  const { data } = await api.patch<ApiResponse<ReviewResponse>>(
    `/wedding-requests/guest-custom-messages/${id}`,
    { decision, note },
  );
  if (!data.success || !data.data) throw new Error(data.message ?? 'עדכון בקשת ההודעה נכשל');
  return data.data;
}