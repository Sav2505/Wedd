import {
  FACE_RECOGNITION_CONFIG,
} from '../config';
import type {
  DetectedFace,
  PersonCluster,
} from '../types/faceRecognition.types';
import { clusterFaces, mergeClusters, toPersonClusters } from '../utils/clustering';

interface ClusterInWorkerOptions {
  faces: DetectedFace[];
  similarityThreshold?: number;
  mergeThreshold?: number;
  signal?: AbortSignal;
  onProgress?: (value: number) => void;
}

type WorkerProgressMessage = {
  type: 'progress';
  stage: 'clustering' | 'merging';
  value: number;
};

type WorkerDoneMessage = {
  type: 'done';
  clusters: PersonCluster[];
};

type WorkerCancelledMessage = {
  type: 'cancelled';
};

type WorkerErrorMessage = {
  type: 'error';
  message: string;
};

type WorkerMessage =
  | WorkerProgressMessage
  | WorkerDoneMessage
  | WorkerCancelledMessage
  | WorkerErrorMessage;

export function clusterFacesOnMainThread(
  faces: DetectedFace[],
  similarityThreshold: number = FACE_RECOGNITION_CONFIG.similarityThreshold,
  mergeThreshold: number = FACE_RECOGNITION_CONFIG.clusterMergeThreshold,
): PersonCluster[] {
  const clusters = clusterFaces(faces, {
    similarityThreshold,
    metric: 'cosine',
  });

  const facesById = new Map(faces.map((face) => [face.id, face]));
  const merged = mergeClusters(clusters, facesById, mergeThreshold);
  return toPersonClusters(merged, facesById);
}

export function clusterFacesInWorker(options: ClusterInWorkerOptions): Promise<PersonCluster[]> {
  const { faces, similarityThreshold, mergeThreshold, signal, onProgress } = options;

  if (typeof Worker === 'undefined') {
    return Promise.resolve(clusterFacesOnMainThread(faces, similarityThreshold, mergeThreshold));
  }

  return new Promise<PersonCluster[]>((resolve, reject) => {
    const worker = new Worker(new URL('../workers/faceRecognition.worker.ts', import.meta.url), {
      type: 'module',
    });

    const stopWorker = (): void => {
      worker.terminate();
    };

    const onAbort = (): void => {
      worker.postMessage({ type: 'cancel' });
      stopWorker();
      reject(new DOMException('scan_cancelled', 'AbortError'));
    };

    if (signal) {
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
    }

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const payload = event.data;
      if (payload.type === 'progress') {
        onProgress?.(payload.value);
        return;
      }

      if (payload.type === 'done') {
        signal?.removeEventListener('abort', onAbort);
        stopWorker();
        resolve(payload.clusters);
        return;
      }

      if (payload.type === 'cancelled') {
        signal?.removeEventListener('abort', onAbort);
        stopWorker();
        reject(new DOMException('scan_cancelled', 'AbortError'));
        return;
      }

      signal?.removeEventListener('abort', onAbort);
      stopWorker();
      reject(new Error(payload.message));
    };

    worker.onerror = () => {
      signal?.removeEventListener('abort', onAbort);
      stopWorker();
      reject(new Error('Face clustering worker failed'));
    };

    worker.postMessage({
      type: 'cluster',
      faces,
      similarityThreshold: similarityThreshold ?? FACE_RECOGNITION_CONFIG.similarityThreshold,
      mergeThreshold: mergeThreshold ?? FACE_RECOGNITION_CONFIG.clusterMergeThreshold,
    });
  });
}
