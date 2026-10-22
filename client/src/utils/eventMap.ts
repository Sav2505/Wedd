import type { EventMapDocument, MapCategory, MapElement, MapPoint } from '../types/eventMap';

export const mapCategoryLabels: Record<MapCategory, string> = {
  parking: 'חניה', entrance: 'כניסה', hall: 'אולם', chuppah: 'חופה', toilets: 'שירותים',
  accessibility: 'נגישות', nursing: 'חדר הנקה', quiet: 'אזור שקט', general: 'כללי',
};
export const emptyEventMap = (): EventMapDocument => ({ schemaVersion: 1, width: 1000, height: 700, hasBackground: false, elements: [] });
export function toMapPosition(point: MapPoint, document: Pick<EventMapDocument, 'width' | 'height'>): [number, number] {
  return [(1 - point.y) * document.height, point.x * document.width];
}
export function fromMapPosition(latitude: number, longitude: number, document: Pick<EventMapDocument, 'width' | 'height'>): MapPoint {
  const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return { x: clamp(longitude / document.width), y: clamp(1 - latitude / document.height) };
}
export function elementCenter(element: MapElement): MapPoint {
  if (element.kind === 'marker') return element.point;
  const points = element.kind === 'path' ? element.points : element.corners;
  return { x: points.reduce((total, point) => total + point.x, 0) / points.length, y: points.reduce((total, point) => total + point.y, 0) / points.length };
}
export function mapHasContent(document: EventMapDocument) { return document.hasBackground || document.elements.length > 0; }

export function moveMapElement(element: MapElement, destination: MapPoint): MapElement {
  const center = elementCenter(element);
  const points = element.kind === 'marker' ? [element.point] : element.kind === 'path' ? element.points : element.corners;
  const deltaX = Math.max(-Math.min(...points.map(point => point.x)), Math.min(1 - Math.max(...points.map(point => point.x)), destination.x - center.x));
  const deltaY = Math.max(-Math.min(...points.map(point => point.y)), Math.min(1 - Math.max(...points.map(point => point.y)), destination.y - center.y));
  const move = (point: MapPoint): MapPoint => ({ x: point.x + deltaX, y: point.y + deltaY });
  if (element.kind === 'marker') return { ...element, point: move(element.point) };
  if (element.kind === 'path') return { ...element, points: element.points.map(move) };
  return { ...element, corners: [move(element.corners[0]), move(element.corners[1])] };
}