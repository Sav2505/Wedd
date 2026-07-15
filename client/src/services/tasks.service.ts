import api from './api';
import { ApiResponse, TaskFormData, WeddingTask } from '../types/domain';

export async function getTasks(weddingId: number): Promise<WeddingTask[]> {
  const { data } = await api.get<ApiResponse<WeddingTask[]>>('/tasks', { params: { wedding_id: weddingId } });
  if (!data.success || !data.data) throw new Error(data.message ?? 'שגיאה בטעינת משימות');
  return data.data;
}

export async function createTask(weddingId: number, payload: TaskFormData): Promise<WeddingTask> {
  const { data } = await api.post<ApiResponse<WeddingTask>>('/tasks', { ...payload, wedding_id: weddingId });
  if (!data.success || !data.data) throw new Error(data.message ?? 'שגיאה ביצירת משימה');
  return data.data;
}

export async function updateTask(id: string, payload: Partial<TaskFormData>): Promise<WeddingTask> {
  const { data } = await api.put<ApiResponse<WeddingTask>>(`/tasks/${id}`, payload);
  if (!data.success || !data.data) throw new Error(data.message ?? 'שגיאה בעדכון משימה');
  return data.data;
}

export async function deleteTask(id: string): Promise<void> {
  const { data } = await api.delete<ApiResponse>(`/tasks/${id}`);
  if (!data.success) throw new Error(data.message ?? 'שגיאה במחיקת משימה');
}
