import { PoolClient } from 'pg';
import { pool } from '../db/pool';
import { createError } from '../middleware/errorHandler';
import { emptyEventMap, EventMapDocument } from '../types/eventMap';

type Versions = { expectedRevision: number; expectedPublishedRevision: number | null };
type Image = { data: Buffer; mimeType: string; width: number; height: number };
type MapRow = {
  draft_document: EventMapDocument;
  revision: number;
  published_revision: number | null;
  published_at: string | null;
};

async function weddingFor(identity: string, couple: boolean, connection: Pick<PoolClient, 'query'> = pool): Promise<number> {
  const { rows } = await connection.query(
    'SELECT wedding_id, role FROM guests WHERE id = $1', [identity],
  );
  if (!rows[0]) throw createError('משתמש לא מזוהה', 401);
  if (couple && rows[0].role !== 'couple') throw createError('אין הרשאה לעריכת המפה', 403);
  return rows[0].wedding_id;
}

function draftView(row?: MapRow) {
  return {
    document: row?.draft_document ?? emptyEventMap(), revision: row?.revision ?? 0,
    publishedRevision: row?.published_revision ?? null, publishedAt: row?.published_at ?? null,
  };
}

export async function getDraft(identity: string) {
  const weddingId = await weddingFor(identity, true);
  const { rows } = await pool.query<MapRow>(
    'SELECT draft_document, revision, published_revision, published_at FROM wedding_event_maps WHERE wedding_id = $1', [weddingId],
  );
  return draftView(rows[0]);
}

export async function getPublished(identity: string) {
  const weddingId = await weddingFor(identity, false);
  const { rows } = await pool.query(
    `SELECT published_document AS document, published_revision AS revision, published_at AS "publishedAt"
     FROM wedding_event_maps WHERE wedding_id = $1 AND published_document IS NOT NULL`, [weddingId],
  );
  return rows[0] ?? null;
}

async function mutate(identity: string, versions: Versions, action: (connection: PoolClient, weddingId: number, row: MapRow) => Promise<void>) {
  const connection = await pool.connect();
  try {
    await connection.query('BEGIN');
    const weddingId = await weddingFor(identity, true, connection);
    await connection.query(
      'INSERT INTO wedding_event_maps (wedding_id) VALUES ($1) ON CONFLICT (wedding_id) DO NOTHING', [weddingId],
    );
    const { rows } = await connection.query<MapRow>(
      `SELECT draft_document, revision, published_revision, published_at FROM wedding_event_maps
       WHERE wedding_id = $1 FOR UPDATE`, [weddingId],
    );
    const row = rows[0];
    if (row.revision !== versions.expectedRevision || row.published_revision !== versions.expectedPublishedRevision) {
      throw createError('המפה עודכנה בחלון אחר. יש לטעון את הגרסה העדכנית לפני שמירה', 409);
    }
    await action(connection, weddingId, row);
    const result = await connection.query<MapRow>(
      'SELECT draft_document, revision, published_revision, published_at FROM wedding_event_maps WHERE wedding_id = $1', [weddingId],
    );
    await connection.query('COMMIT');
    return draftView(result.rows[0]);
  } catch (error) {
    await connection.query('ROLLBACK');
    throw error;
  } finally {
    connection.release();
  }
}

export async function saveDraft(identity: string, versions: Versions, document: EventMapDocument, backgroundAction: 'keep' | 'replace' | 'remove', image?: Image) {
  return mutate(identity, versions, async (connection, weddingId, row) => {
    const nextDocument = { ...document };
    if (backgroundAction === 'replace') {
      if (!image) throw createError('לא נבחרה תמונת רקע', 400);
      Object.assign(nextDocument, { width: image.width, height: image.height, hasBackground: true });
    } else if (backgroundAction === 'remove') {
      nextDocument.hasBackground = false;
    } else {
      if (document.hasBackground !== row.draft_document.hasBackground
        || document.width !== row.draft_document.width || document.height !== row.draft_document.height) {
        throw createError('מידות המפה אינן תואמות לרקע השמור', 400);
      }
    }
    await connection.query(
      `UPDATE wedding_event_maps SET draft_document = $2, revision = revision + 1, updated_at = NOW(),
       draft_background_data = CASE WHEN $3 = 'keep' THEN draft_background_data ELSE $4 END,
       draft_background_mime_type = CASE WHEN $3 = 'keep' THEN draft_background_mime_type ELSE $5 END
       WHERE wedding_id = $1`,
      [weddingId, nextDocument, backgroundAction, image?.data ?? null, image?.mimeType ?? null],
    );
  });
}

export async function setPublished(identity: string, versions: Versions, publish: boolean) {
  return mutate(identity, versions, async (connection, weddingId, row) => {
    if (publish && !row.draft_document.hasBackground && row.draft_document.elements.length === 0) {
      throw createError('יש להוסיף רקע או אלמנט לפני הפרסום', 400);
    }
    await connection.query(publish
      ? `UPDATE wedding_event_maps SET published_document = draft_document, published_revision = revision,
         published_background_data = draft_background_data, published_background_mime_type = draft_background_mime_type,
         published_at = NOW(), updated_at = NOW() WHERE wedding_id = $1`
      : `UPDATE wedding_event_maps SET published_document = NULL, published_revision = NULL,
         published_background_data = NULL, published_background_mime_type = NULL,
         published_at = NULL, updated_at = NOW() WHERE wedding_id = $1`, [weddingId],
    );
  });
}

export async function getBackground(identity: string, draft: boolean, revision: number) {
  const weddingId = await weddingFor(identity, draft);
  const column = draft ? 'draft' : 'published';
  const versionColumn = draft ? 'revision' : 'published_revision';
  const { rows } = await pool.query(
    `SELECT ${column}_background_data AS data, ${column}_background_mime_type AS "mimeType"
     FROM wedding_event_maps WHERE wedding_id = $1 AND ${versionColumn} = $2
     AND ${column}_document IS NOT NULL AND ${column}_background_data IS NOT NULL`, [weddingId, revision],
  );
  if (!rows[0]) throw createError('הרקע אינו זמין בגרסה זו. יש לרענן את המפה', 404);
  return rows[0] as { data: Buffer; mimeType: string };
}