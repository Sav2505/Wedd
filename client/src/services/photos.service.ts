import api from './api';
import { ApiResponse, Photo } from '../types/domain';

export async function getPhotos(): Promise<Photo[]> {
  const { data } = await api.get<ApiResponse<Photo[]>>('/photos');
  if (!data.success || !data.data) throw new Error(data.message ?? 'שגיאה בטעינת תמונות');
  return data.data;
}

export async function uploadPhoto(
  uploaderId: string,
  file: File,
  caption?: string,
): Promise<Photo> {
  const form = new FormData();
  form.append('photo', file);
  form.append('uploaderId', uploaderId);
  if (caption) form.append('caption', caption);

  const { data } = await api.post<ApiResponse<Photo>>('/photos', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  if (!data.success || !data.data) throw new Error(data.message ?? 'שגיאה בהעלאת תמונה');
  return data.data;
}

export async function deletePhoto(photoId: string, requesterId: string): Promise<void> {
  await api.delete(`/photos/${photoId}`, { data: { requesterId } });
}
