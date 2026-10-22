import api from './api';
import { ApiResponse, RideKind, RidePost, RideStatus } from '../types/domain';

export interface RidePostInput {
  kind: RideKind;
  display_name: string;
  contact_phone: string;
  origin_text: string;
  time_from: string;
  time_to: string | null;
  seats_available: number | null;
  passenger_count: number | null;
  notes: string | null;
  consent: true;
}

export function normalizeIsraeliPhone(phone: string): string {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+') && !digits.startsWith('972')) {
    throw new Error('מספר הטלפון אינו תקין');
  }
  const nationalDigits = (digits.startsWith('972') ? digits.slice(3) : digits).replace(/^0/, '');
  if (!/^[1-9]\d{7,9}$/.test(nationalDigits)) {
    throw new Error('מספר הטלפון אינו תקין');
  }
  return `+972${nationalDigits}`;
}

function normalizeInput(input: RidePostInput): RidePostInput {
  return { ...input, contact_phone: normalizeIsraeliPhone(input.contact_phone) };
}

async function unwrapRide(response: Promise<{ data: ApiResponse<RidePost> }>): Promise<RidePost> {
  const { data } = await response;
  if (!data.success || !data.data) throw new Error(data.message ?? 'לא ניתן לשמור את הפרסום');
  return data.data;
}

export async function getRidePosts(): Promise<RidePost[]> {
  const { data } = await api.get<ApiResponse<RidePost[]>>('/rides');
  if (!data.success || !data.data) throw new Error(data.message ?? 'לא ניתן לטעון את הנסיעות');
  return data.data;
}

export function createRidePost(input: RidePostInput): Promise<RidePost> {
  return unwrapRide(api.post<ApiResponse<RidePost>>('/rides', normalizeInput(input)));
}

export function editRidePost(id: string, input: RidePostInput): Promise<RidePost> {
  return unwrapRide(api.put<ApiResponse<RidePost>>(`/rides/${id}`, normalizeInput(input)));
}

export async function changeRidePostStatus(id: string, status: Extract<RideStatus, 'full' | 'closed'>): Promise<RidePost> {
  return unwrapRide(api.patch<ApiResponse<RidePost>>(`/rides/${id}/status`, { status }));
}

export async function removeRidePost(id: string): Promise<void> {
  await api.delete(`/rides/${id}`);
}