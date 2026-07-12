import api from './api';
import { ApiResponse, LoginRequest, LoginResponse } from '../types/domain';

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/login', payload);
  if (!data.success || !data.data) {
    throw new Error(data.message ?? 'שגיאה בהתחברות');
  }
  return data.data;
}