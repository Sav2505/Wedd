import { describe, expect, it } from 'vitest';
import { snapToFloorPlanGrid } from './floorPlanGrid';

describe('floor plan grid snapping', () => {
    it('snaps positions to the nearest grid line', () => {
        expect(snapToFloorPlanGrid(42.4, 0, 100)).toBe(40);
        expect(snapToFloorPlanGrid(42.6, 0, 100)).toBe(45);
    });

    it('keeps snapped positions inside the drag boundaries', () => {
        expect(snapToFloorPlanGrid(-10, -2, 88)).toBe(0);
        expect(snapToFloorPlanGrid(100, -2, 88)).toBe(85);
        expect(snapToFloorPlanGrid(13, 14, 87)).toBe(15);
        expect(snapToFloorPlanGrid(89, 14, 87)).toBe(85);
    });
});