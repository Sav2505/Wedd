import imageCompression from 'browser-image-compression';
import api from './api';
import { ApiResponse, Photo } from '../types/domain';

export async function getPhotos(weddingId: number): Promise<Photo[]> {
  const { data } = await api.get<ApiResponse<Photo[]>>('/photos', {
    params: { weddingId },
  });

  if (!data.success || !data.data) {
    throw new Error(data.message ?? 'שגיאה בטעינת תמונות');
  }

  return data.data;
}

/** Compress one image into thumb (400px) + full (1920px) blobs */
async function compressPhoto(file: File): Promise<{ thumb: Blob; full: Blob; mimeType: string }> {
  const [thumb, full] = await Promise.all([
    imageCompression(file, {
      maxWidthOrHeight: 400,
      maxSizeMB: 0.04,
      useWebWorker: true,
      fileType: 'image/jpeg',
    }),
    imageCompression(file, {
      maxWidthOrHeight: 1920,
      maxSizeMB: 0.5,
      useWebWorker: true,
      fileType: 'image/jpeg',
    }),
  ]);
  return { thumb, full, mimeType: 'image/jpeg' };
}

/** Upload a single file (with client-side compression). Returns the saved Photo. */
export async function uploadPhoto(
  uploaderId: string,
  file: File,
  weddingId: number | null,
  caption?: string,
  onProgress?: (pct: number) => void,
): Promise<Photo> {
  const { thumb, full } = await compressPhoto(file);
  onProgress?.(30); // compression done

  const form = new FormData();
  form.append('thumb', thumb, 'thumb.jpg');
  form.append('full', full, 'full.jpg');
  form.append('uploaderId', uploaderId);
  if (weddingId) {
    form.append('weddingId', String(weddingId));
  }
  if (caption) form.append('caption', caption);

  const { data } = await api.post<ApiResponse<Photo>>('/photos', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (e.total) onProgress?.(30 + Math.round((e.loaded / e.total) * 70));
    },
  });
  if (!data.success || !data.data) throw new Error(data.message ?? 'שגיאה בהעלאת תמונה');
  return data.data;
}

export async function deletePhoto(photoId: string): Promise<void> {
  // X-Guest-ID is attached automatically by the axios interceptor
  await api.delete(`/photos/${photoId}`);
}

