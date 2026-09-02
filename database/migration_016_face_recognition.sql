-- ============================================================
-- Migration 016 — Face recognition persistence
-- ============================================================

CREATE TABLE IF NOT EXISTS face_clusters (
  id TEXT PRIMARY KEY,
  wedding_id INTEGER NOT NULL REFERENCES wedding_info(id) ON DELETE CASCADE,
  representative_photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  representative_face_id TEXT NULL,
  face_count INTEGER NOT NULL DEFAULT 0,
  photo_count INTEGER NOT NULL DEFAULT 0,
  centroid_embedding REAL[] NOT NULL,
  confidence REAL NOT NULL DEFAULT 0,
  scan_version TEXT NOT NULL,
  model_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_face_clusters_face_count_non_negative CHECK (face_count >= 0),
  CONSTRAINT chk_face_clusters_photo_count_non_negative CHECK (photo_count >= 0)
);

CREATE TABLE IF NOT EXISTS photo_faces (
  id TEXT PRIMARY KEY,
  wedding_id INTEGER NOT NULL REFERENCES wedding_info(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  cluster_id TEXT NULL REFERENCES face_clusters(id) ON DELETE SET NULL,
  bounding_box JSONB NOT NULL,
  embedding REAL[] NOT NULL,
  confidence REAL NULL,
  source_width INTEGER NOT NULL,
  source_height INTEGER NOT NULL,
  scan_version TEXT NOT NULL,
  model_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_photo_faces_source_width_positive CHECK (source_width > 0),
  CONSTRAINT chk_photo_faces_source_height_positive CHECK (source_height > 0)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_face_clusters_representative_face'
  ) THEN
    ALTER TABLE face_clusters
      ADD CONSTRAINT fk_face_clusters_representative_face
      FOREIGN KEY (representative_face_id)
      REFERENCES photo_faces(id)
      ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN invalid_foreign_key THEN
    -- Keep migration idempotent in legacy environments; app-level flow inserts faces first, then updates representative face.
    NULL;
END
$$;

CREATE INDEX IF NOT EXISTS idx_face_clusters_wedding_id ON face_clusters(wedding_id);
CREATE INDEX IF NOT EXISTS idx_face_clusters_scan_model ON face_clusters(scan_version, model_version);
CREATE INDEX IF NOT EXISTS idx_face_clusters_representative_photo ON face_clusters(representative_photo_id);

CREATE INDEX IF NOT EXISTS idx_photo_faces_wedding_id ON photo_faces(wedding_id);
CREATE INDEX IF NOT EXISTS idx_photo_faces_photo_id ON photo_faces(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_faces_cluster_id ON photo_faces(cluster_id);
CREATE INDEX IF NOT EXISTS idx_photo_faces_scan_model ON photo_faces(scan_version, model_version);

CREATE INDEX IF NOT EXISTS idx_photo_faces_bounding_box_gin ON photo_faces USING GIN (bounding_box);
