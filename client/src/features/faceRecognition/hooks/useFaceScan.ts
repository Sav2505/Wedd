import { useCallback, useEffect, useRef, useState } from 'react';
import type { Photo } from '../../../types/domain';
import {
  FACE_MODEL_VERSION,
  FACE_SCAN_VERSION,
  type FaceScanStage,
} from '../config';
import type {
  DetectedFace,
  FaceScanProgress,
  FaceScanResult,
} from '../types/faceRecognition.types';
import {
  buildPersistenceClusters,
  buildPersistenceFaces,
  fetchScannedPhotoIds,
  persistScanResult,
  scanPhotosForFaces,
  toFaceScanResult,
} from '../services/faceRecognition.service';
import { clusterFacesInWorker } from '../services/faceClustering.service';

interface UseFaceScanOptions {
  weddingId: number | null;
  photos: Photo[];
  onScanCompleted?: (result: FaceScanResult) => void;
  forceFullRescan?: boolean;
}

interface UseFaceScanResult {
  startScan: () => Promise<void>;
  cancelScan: () => void;
  progress: FaceScanProgress;
  isScanning: boolean;
  error: string | null;
  lastResult: FaceScanResult | null;
}

function defaultProgress(): FaceScanProgress {
  return {
    stage: 'idle',
    total: 0,
    processed: 0,
    percentage: 0,
    facesFound: 0,
    errorsCount: 0,
  };
}

function updateStage(
  current: FaceScanProgress,
  stage: FaceScanStage,
  message?: string,
): FaceScanProgress {
  return {
    ...current,
    stage,
    message,
  };
}

export function useFaceScan(options: UseFaceScanOptions): UseFaceScanResult {
  const { weddingId, photos, onScanCompleted, forceFullRescan = false } = options;

  const [progress, setProgress] = useState<FaceScanProgress>(defaultProgress);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<FaceScanResult | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
    };
  }, []);

  const cancelScan = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsScanning(false);
    setProgress((prev) => updateStage(prev, 'cancelled', 'הסריקה בוטלה'));
  }, []);

  const startScan = useCallback(async () => {
    if (isScanning || abortControllerRef.current) {
      return;
    }

    if (!weddingId) {
      setError('לא נמצא weddingId לסריקה');
      return;
    }

    if (photos.length === 0) {
      setError('אין תמונות לסריקה');
      return;
    }

    setError(null);
    setIsScanning(true);
    setLastResult(null);

    const startedAt = new Date().toISOString();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setProgress({
        stage: 'initializing',
        total: photos.length,
        processed: 0,
        percentage: 0,
        facesFound: 0,
        errorsCount: 0,
      });

      const alreadyScanned = forceFullRescan
        ? new Set<string>()
        : await fetchScannedPhotoIds(weddingId, FACE_SCAN_VERSION, FACE_MODEL_VERSION);

      const scanResult = await scanPhotosForFaces({
        weddingId,
        photos,
        alreadyScanned,
        signal: controller.signal,
        onProgress: (nextProgress) => {
          setProgress(nextProgress);
        },
      });

      setProgress((prev) => updateStage(prev, 'clustering'));

      const clusters = await clusterFacesInWorker({
        faces: scanResult.faces,
        signal: controller.signal,
        onProgress: (value) => {
          setProgress((prev) => ({
            ...prev,
            stage: 'clustering',
            percentage: Math.max(prev.percentage, value),
          }));
        },
      });

      if (controller.signal.aborted) {
        throw new DOMException('scan_cancelled', 'AbortError');
      }

      const clusterIdByFaceId = new Map<string, string>();
      for (const cluster of clusters) {
        for (const face of cluster.faces) {
          clusterIdByFaceId.set(face.id, cluster.id);
        }
      }

      let facesForPersistence: DetectedFace[] = scanResult.faces.map((face) => ({
        ...face,
        clusterId: clusterIdByFaceId.get(face.id) ?? null,
      }));

      // Defensive fallback: if scanResult was unexpectedly empty but worker returned members,
      // persist worker faces so completed scans do not silently save empty arrays.
      if (facesForPersistence.length === 0 && clusters.length > 0) {
        const unique = new Map<string, DetectedFace>();
        for (const cluster of clusters) {
          for (const face of cluster.faces) {
            unique.set(face.id, {
              ...face,
              clusterId: cluster.id,
            });
          }
        }
        facesForPersistence = Array.from(unique.values());
      }

      setProgress((prev) => updateStage(prev, 'saving'));

      await persistScanResult({
        weddingId,
        scanVersion: FACE_SCAN_VERSION,
        modelVersion: FACE_MODEL_VERSION,
        faces: buildPersistenceFaces(facesForPersistence),
        clusters: buildPersistenceClusters(clusters),
      });

      const completed = toFaceScanResult({
        weddingId,
        startedAt,
        faces: facesForPersistence,
        clusters,
        errors: scanResult.errors,
        skippedPhotoIds: scanResult.skippedPhotoIds,
      });

      setLastResult(completed);
      setProgress((prev) => ({
        ...prev,
        stage: 'completed',
        processed: photos.length,
        total: photos.length,
        percentage: 100,
      }));

      onScanCompleted?.(completed);
    } catch (scanError) {
      if (scanError instanceof DOMException && scanError.name === 'AbortError') {
        setProgress((prev) => updateStage(prev, 'cancelled', 'הסריקה בוטלה'));
      } else {
        setError(scanError instanceof Error ? scanError.message : 'שגיאה בסריקת פנים');
        setProgress((prev) => updateStage(prev, 'error'));
      }
    } finally {
      setIsScanning(false);
      abortControllerRef.current = null;
    }
  }, [forceFullRescan, isScanning, onScanCompleted, photos, weddingId]);

  return {
    startScan,
    cancelScan,
    progress,
    isScanning,
    error,
    lastResult,
  };
}
