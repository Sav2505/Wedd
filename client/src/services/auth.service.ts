import api from './api';
import { ApiResponse, Guest, LoginRequest, LoginResponse } from '../types/domain';

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/login', payload);
  if (!data.success || !data.data) {
    throw new Error(data.message ?? 'שגיאה בהתחברות');
  }
  return data.data;
}

export async function markToured(): Promise<Guest> {
  const { data } = await api.patch<ApiResponse<{ guest: Guest }>>('/auth/mark-toured');
  if (!data.success || !data.data?.guest) {
    throw new Error(data.message ?? 'שגיאה בסיום הסיור');
  }
  return data.data.guest;
}