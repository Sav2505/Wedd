import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { createError } from '../middleware/errorHandler';
import * as maps from '../services/eventMap.service';
import { eventMapDocumentSchema, mapVersionSchema } from '../types/eventMap';
import { normalizeMapImage } from '../utils/eventMapImage';

type MapRequest = Request & { coupleId?: string; guestId?: string };
const saveSchema = mapVersionSchema.extend({
  document: eventMapDocumentSchema,
  backgroundAction: z.enum(['keep', 'replace', 'remove']),
}).strict();

export function mapHandler(action: 'draft' | 'published' | 'save' | 'publish' | 'unpublish' | 'draftImage' | 'publishedImage') {
  return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      const req = request as MapRequest;
      const identity = req.coupleId ?? req.guestId;
      if (!identity) throw createError('נדרשת הזדהות', 401);
      response.set({ 'Cache-Control': 'private, no-store', Vary: 'X-Guest-ID', 'X-Content-Type-Options': 'nosniff' });
      if (action === 'draftImage' || action === 'publishedImage') {
        const revision = z.coerce.number().int().nonnegative().safeParse(req.query.revision);
        if (!revision.success || Object.keys(req.query).some(key => key !== 'revision')) throw createError('גרסת רקע אינה תקינה', 400);
        const image = await maps.getBackground(identity, action === 'draftImage', revision.data);
        response.type(image.mimeType).send(image.data);
        return;
      }
      if (Object.keys(req.query).length) throw createError('פרמטרים לא תקינים', 400);
      let data;
      if (action === 'draft') data = await maps.getDraft(identity);
      else if (action === 'published') data = await maps.getPublished(identity);
      else if (action === 'save') {
        let raw: unknown;
        try { raw = JSON.parse(req.body.payload); } catch { throw createError('מסמך המפה אינו תקין', 400); }
        const parsed = saveSchema.safeParse(raw);
        if (!parsed.success || Object.keys(req.body).some(key => key !== 'payload')) throw createError('נתוני המפה אינם תקינים', 400);
        const input = parsed.data;
        if ((input.backgroundAction === 'replace') !== Boolean(req.file)) throw createError('פעולת הרקע אינה תואמת לקובץ', 400);
        const image = req.file ? await normalizeMapImage(req.file) : undefined;
        data = await maps.saveDraft(identity, input, input.document, input.backgroundAction, image);
      } else {
        const parsed = mapVersionSchema.safeParse(req.body);
        if (!parsed.success) throw createError('גרסת המפה אינה תקינה', 400);
        data = await maps.setPublished(identity, parsed.data, action === 'publish');
      }
      response.json({ success: true, data });
    } catch (error) { next(error); }
  };
}