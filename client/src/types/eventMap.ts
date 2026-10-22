export type MapCategory = 'parking' | 'entrance' | 'hall' | 'chuppah' | 'toilets' | 'accessibility' | 'nursing' | 'quiet' | 'general';
export type MapPoint = { x: number; y: number };
export const mapColors = ['#176B58', '#2457A7', '#9A6520', '#A52D45', '#59438C', '#263238'] as const;
type ElementBase = {
  id: string; category: MapCategory; icon: MapCategory; label: string; note: string; color: typeof mapColors[number];
};
export type MapElement = ElementBase & (
  { kind: 'marker'; point: MapPoint }
  | { kind: 'path'; points: MapPoint[]; dashed: boolean }
  | { kind: 'area'; corners: [MapPoint, MapPoint] }
);
export interface EventMapDocument {
  schemaVersion: 1; width: number; height: number; hasBackground: boolean; elements: MapElement[];
}
export interface EventMapDraft {
  document: EventMapDocument; revision: number; publishedRevision: number | null; publishedAt: string | null;
}
export interface PublishedEventMap { document: EventMapDocument; revision: number; publishedAt: string }
export type MapTool = 'select' | MapElement['kind'];