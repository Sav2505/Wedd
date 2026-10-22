import { z } from 'zod';

export const mapCategories = ['parking', 'entrance', 'hall', 'chuppah', 'toilets', 'accessibility', 'nursing', 'quiet', 'general'] as const;
const pointSchema = z.object({ x: z.number().finite().min(0).max(1), y: z.number().finite().min(0).max(1) }).strict();
const elementFields = {
  id: z.string().uuid(),
  category: z.enum(mapCategories),
  icon: z.enum(mapCategories),
  label: z.string().trim().min(1).max(80),
  note: z.string().max(1000),
  color: z.enum(['#176B58', '#2457A7', '#9A6520', '#A52D45', '#59438C', '#263238']),
};

export const eventMapDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  width: z.number().int().min(100).max(4096),
  height: z.number().int().min(100).max(4096),
  hasBackground: z.boolean(),
  elements: z.array(z.discriminatedUnion('kind', [
    z.object({ ...elementFields, kind: z.literal('marker'), point: pointSchema }).strict(),
    z.object({ ...elementFields, kind: z.literal('path'), points: z.array(pointSchema).min(2).max(100), dashed: z.boolean() }).strict(),
    z.object({ ...elementFields, kind: z.literal('area'), corners: z.tuple([pointSchema, pointSchema]) }).strict(),
  ])).max(200),
}).strict().superRefine((document, context) => {
  const ids = new Set<string>();
  let vertices = 0;
  for (const element of document.elements) {
    if (ids.has(element.id)) context.addIssue({ code: 'custom', message: 'מזהה אלמנט כפול' });
    ids.add(element.id);
    if (element.kind === 'path') {
      vertices += element.points.length;
      if (element.points.every(point => point.x === element.points[0].x && point.y === element.points[0].y)) {
        context.addIssue({ code: 'custom', message: 'המסלול צריך לכלול נקודות שונות' });
      }
    } else if (element.kind === 'area') {
      vertices += 2;
      if (element.corners[0].x === element.corners[1].x || element.corners[0].y === element.corners[1].y) {
        context.addIssue({ code: 'custom', message: 'שטח האזור חייב להיות גדול מאפס' });
      }
    } else vertices += 1;
  }
  if (vertices > 5000) context.addIssue({ code: 'custom', message: 'יותר מדי נקודות במפה' });
  if (Buffer.byteLength(JSON.stringify(document), 'utf8') > 256 * 1024) {
    context.addIssue({ code: 'custom', message: 'מסמך המפה גדול מדי' });
  }
});

export type EventMapDocument = z.infer<typeof eventMapDocumentSchema>;
export const emptyEventMap = (): EventMapDocument => ({ schemaVersion: 1, width: 1000, height: 700, hasBackground: false, elements: [] });
export const mapVersionSchema = z.object({
  expectedRevision: z.number().int().nonnegative(),
  expectedPublishedRevision: z.number().int().nonnegative().nullable(),
}).strict();