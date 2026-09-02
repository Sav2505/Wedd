import type { FaceDetection } from 'facenet-js';
import type { FaceBoundingBox, PhotoDimensions } from '../types/faceRecognition.types';

export interface PreparedImage {
  image: HTMLImageElement;
  objectUrl: string;
}

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export function resolvePhotoImageUrl(url: string): string {
  if (url.startsWith('/photos/')) {
    return `${API_BASE}${url}`;
  }
  return url;
}

export async function loadImageElement(photoUrl: string): Promise<PreparedImage> {
  const objectUrl = photoUrl;

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.crossOrigin = 'anonymous';
    element.decoding = 'async';
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('טעינת התמונה נכשלה'));
    element.src = objectUrl;
  });

  return { image, objectUrl };
}

export function getImageDimensions(image: HTMLImageElement): PhotoDimensions {
  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
}

export function convertDetectionToBoundingBox(
  detection: FaceDetection,
  sourceDimensions: PhotoDimensions,
): FaceBoundingBox {
  const boxCandidate = detection.boundingBox as unknown as Record<string, unknown>;

  const originX = Number(boxCandidate.originX ?? boxCandidate.xCenter ?? 0);
  const originY = Number(boxCandidate.originY ?? boxCandidate.yCenter ?? 0);
  const width = Number(boxCandidate.width ?? 0);
  const height = Number(boxCandidate.height ?? 0);

  if (originX <= 1 && originY <= 1 && width <= 1 && height <= 1) {
    return {
      x: Math.max(0, originX * sourceDimensions.width),
      y: Math.max(0, originY * sourceDimensions.height),
      width: Math.max(0, width * sourceDimensions.width),
      height: Math.max(0, height * sourceDimensions.height),
    };
  }

  return {
    x: Math.max(0, originX),
    y: Math.max(0, originY),
    width: Math.max(0, width),
    height: Math.max(0, height),
  };
}

export function toFullResolutionSrc(url: string): string {
  return resolvePhotoImageUrl(url.includes('/thumb') ? url.replace('/thumb', '/full') : url);
}

export function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}
