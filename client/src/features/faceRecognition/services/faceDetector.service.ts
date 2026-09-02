import { FaceDetector, type FaceDetectionOptions } from 'facenet-js';
import {
  FACE_EMBEDDING_MODEL_PATH,
  FACE_RECOGNITION_CONFIG,
} from '../config';

let detectorInstance: FaceDetector | null = null;
let detectorInitialization: Promise<FaceDetector> | null = null;

function createOptions(device: 'CPU' | 'GPU'): FaceDetectionOptions {
  return {
    device,
    mode: 'IMAGE',
    minDetectionConfidence: FACE_RECOGNITION_CONFIG.minDetectionConfidence,
    embeddingModelPath: FACE_EMBEDDING_MODEL_PATH,
  };
}

async function initializeDetector(device: 'CPU' | 'GPU'): Promise<FaceDetector> {
  const detector = new FaceDetector(createOptions(device));
  await detector.initialize();
  return detector;
}

export async function getFaceDetector(): Promise<FaceDetector> {
  if (detectorInstance) {
    return detectorInstance;
  }

  if (!detectorInitialization) {
    detectorInitialization = (async () => {
      try {
        detectorInstance = await initializeDetector('GPU');
        return detectorInstance;
      } catch (gpuError) {
        console.warn('Face detector GPU initialization failed, retrying on CPU.', gpuError);
        detectorInstance = await initializeDetector('CPU');
        return detectorInstance;
      }
    })().catch((error) => {
      detectorInstance = null;
      detectorInitialization = null;
      throw error;
    });
  }

  return detectorInitialization;
}

export function resetFaceDetector(): void {
  detectorInstance?.close();
  detectorInstance = null;
  detectorInitialization = null;
}
