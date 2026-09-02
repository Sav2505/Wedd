export const FACE_SCAN_VERSION = '1';
export const FACE_MODEL_VERSION = 'facenet-js@0.1.2';

export const FACE_EMBEDDING_MODEL_PATH = '/models/facenet.tflite';

export const FACE_RECOGNITION_CONFIG = {
  minDetectionConfidence: 0.72,
  similarityThreshold: 0.78,
  representativeConfidenceWeight: 0.35,
  representativeCentroidWeight: 0.45,
  representativeAreaWeight: 0.2,
  scanImageMaxDimension: 1280,
  imageYieldInterval: 2,
  maxFacesPerImage: 24,
  minClusterSize: 1,
  clusterMergeThreshold: 0.82,
} as const;

export const FACE_SCAN_STAGE_LABELS = {
  idle: 'מוכן לסריקה',
  initializing: 'טוען מודל זיהוי פנים',
  loadingImage: 'טוען תמונה',
  detecting: 'מזהה פנים',
  embedding: 'יוצר חתימות פנים',
  clustering: 'מקבץ אנשים דומים',
  saving: 'שומר תוצאות',
  completed: 'הסריקה הושלמה',
  cancelled: 'הסריקה בוטלה',
  error: 'אירעה שגיאה בסריקה',
} as const;

export type FaceScanStage = keyof typeof FACE_SCAN_STAGE_LABELS;
