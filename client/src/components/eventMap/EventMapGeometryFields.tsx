import { Box, Button, Checkbox, FormControlLabel, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import type { MapElement, MapPoint } from '../../types/eventMap';

export default function EventMapGeometryFields({ element, onChange }: { element: MapElement; onChange: (element: MapElement) => void }) {
  const points = element.kind === 'marker' ? [element.point] : element.kind === 'path' ? element.points : element.corners;
  function changePoint(index: number, axis: keyof MapPoint, value: string) {
    if (value.trim() === '' || !Number.isFinite(Number(value))) return;
    const updated = points.map((point, position) => position === index ? { ...point, [axis]: Math.max(0, Math.min(100, Number(value))) / 100 } : point);
    if (element.kind === 'marker') onChange({ ...element, point: updated[0] });
    if (element.kind === 'path') onChange({ ...element, points: updated });
    if (element.kind === 'area') onChange({ ...element, corners: updated as [MapPoint, MapPoint] });
  }
  return <Box>
    <Typography variant="subtitle2" sx={{ mb: 1 }}>מיקום במפה (%)</Typography>
    {element.kind === 'path' && <FormControlLabel control={<Checkbox checked={element.dashed} onChange={(_, dashed) => onChange({ ...element, dashed })} />} label="קו מקווקו" />}
    <Stack gap={1} sx={{ maxHeight: 240, overflow: 'auto', pt: 1 }}>
      {points.map((point, index) => <Stack direction="row" gap={1} key={index} alignItems="center">
        <TextField size="small" type="number" label={`אופקי ${index + 1}`} value={Math.round(point.x * 10000) / 100} slotProps={{ htmlInput: { min: 0, max: 100, step: 0.5 } }} onChange={event => changePoint(index, 'x', event.target.value)} />
        <TextField size="small" type="number" label={`אנכי ${index + 1}`} value={Math.round(point.y * 10000) / 100} slotProps={{ htmlInput: { min: 0, max: 100, step: 0.5 } }} onChange={event => changePoint(index, 'y', event.target.value)} />
        {element.kind === 'path' && <Tooltip title={`מחיקת נקודה ${index + 1}`}><span><IconButton aria-label={`מחיקת נקודה ${index + 1}`} disabled={element.points.length <= 2} onClick={() => onChange({ ...element, points: element.points.filter((_, position) => position !== index) })}><DeleteIcon fontSize="small" /></IconButton></span></Tooltip>}
      </Stack>)}
    </Stack>
    {element.kind === 'path' && <Button startIcon={<AddIcon />} disabled={element.points.length >= 100} onClick={() => {
      const last = element.points.at(-1)!;
      const previous = element.points.at(-2)!;
      onChange({ ...element, points: [...element.points.slice(0, -1), { x: (last.x + previous.x) / 2, y: (last.y + previous.y) / 2 }, last] });
    }}>הוספת נקודה</Button>}
  </Box>;
}