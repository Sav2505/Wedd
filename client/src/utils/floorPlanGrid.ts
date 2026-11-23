export const FLOOR_PLAN_GRID_STEP = 5;

export function snapToFloorPlanGrid(position: number, min: number, max: number): number {
    const minGridPosition = Math.ceil(min / FLOOR_PLAN_GRID_STEP) * FLOOR_PLAN_GRID_STEP;
    const maxGridPosition = Math.floor(max / FLOOR_PLAN_GRID_STEP) * FLOOR_PLAN_GRID_STEP;
    return Math.max(minGridPosition, Math.min(maxGridPosition, Math.round(position / FLOOR_PLAN_GRID_STEP) * FLOOR_PLAN_GRID_STEP)) || 0;
}