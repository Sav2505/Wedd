import { describe, expect, it } from 'vitest';
import { emptyEventMap, fromMapPosition, mapHasContent, moveMapElement, toMapPosition } from './eventMap';

describe('event map coordinates', () => {
  it('round trips normalized points independently of dimensions', () => {
    for (const dimensions of [{ width: 1000, height: 700 }, { width: 400, height: 1600 }]) {
      for (const point of [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0.23, y: 0.72 }]) {
        const [latitude, longitude] = toMapPosition(point, dimensions);
        const result = fromMapPosition(latitude, longitude, dimensions);
        expect(result.x).toBeCloseTo(point.x);
        expect(result.y).toBeCloseTo(point.y);
      }
    }
  });
  it('clamps drags and does not allow empty publication', () => {
    expect(fromMapPosition(-100, 2000, emptyEventMap())).toEqual({ x: 1, y: 1 });
    expect(mapHasContent(emptyEventMap())).toBe(false);
    expect(mapHasContent({ ...emptyEventMap(), hasBackground: true })).toBe(true);
  });
  it('moves an entire area without distortion or points leaving the map', () => {
    const area = { id: 'area', kind: 'area' as const, category: 'parking' as const, icon: 'parking' as const, color: '#176B58' as const, label: 'חניה', note: '', corners: [{ x: 0.2, y: 0.2 }, { x: 0.6, y: 0.5 }] as [{ x: number; y: number }, { x: number; y: number }] };
    const result = moveMapElement(area, { x: 1, y: 1 });
    if (result.kind !== 'area') throw new Error('wrong geometry');
    expect(result.corners[1]).toEqual({ x: 1, y: 1 });
    expect(result.corners[0].x).toBeCloseTo(0.6);
    expect(result.corners[0].y).toBeCloseTo(0.7);
  });
});