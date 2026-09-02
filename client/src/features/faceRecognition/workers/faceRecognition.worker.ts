import type {
  DetectedFace,
  PersonCluster,
} from '../types/faceRecognition.types';
import { clusterFaces, mergeClusters, toPersonClusters } from '../utils/clustering';

type ClusterPayload = {
  type: 'cluster';
  faces: DetectedFace[];
  similarityThreshold?: number;
  mergeThreshold?: number;
};

type CancelPayload = {
  type: 'cancel';
};

type WorkerRequest = ClusterPayload | CancelPayload;

type WorkerResponse =
  | { type: 'progress'; stage: 'clustering' | 'merging'; value: number }
  | { type: 'done'; clusters: PersonCluster[] }
  | { type: 'cancelled' }
  | { type: 'error'; message: string };

let cancelled = false;

function post(payload: WorkerResponse): void {
  self.postMessage(payload);
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const payload = event.data;

  if (payload.type === 'cancel') {
    cancelled = true;
    post({ type: 'cancelled' });
    return;
  }

  cancelled = false;

  try {
    if (cancelled) {
      post({ type: 'cancelled' });
      return;
    }

    post({ type: 'progress', stage: 'clustering', value: 20 });

    const baseClusters = clusterFaces(payload.faces, {
      similarityThreshold: payload.similarityThreshold,
      metric: 'cosine',
    });

    if (cancelled) {
      post({ type: 'cancelled' });
      return;
    }

    const facesById = new Map(payload.faces.map((face) => [face.id, face]));
    post({ type: 'progress', stage: 'merging', value: 70 });

    const merged = mergeClusters(baseClusters, facesById, payload.mergeThreshold);
    const personClusters = toPersonClusters(merged, facesById);

    post({ type: 'progress', stage: 'merging', value: 100 });
    post({ type: 'done', clusters: personClusters });
  } catch (error) {
    post({
      type: 'error',
      message: error instanceof Error ? error.message : 'Worker clustering failed',
    });
  }
};

export {};
