import { Box, List, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
import type { MapElement } from '../../types/eventMap';
import { mapCategoryLabels } from '../../utils/eventMap';
import MapSymbol from './MapSymbol';

export default function EventMapLegend({ elements, selectedId, onSelect }: { elements: MapElement[]; selectedId: string | null; onSelect: (id: string) => void }) {
  return <Box sx={{ mt: 2 }}>
    <Typography component="h3" variant="subtitle2">מקרא ונקודות במפה</Typography>
    <List dense aria-label="נקודות ואזורים במפת האירוע" sx={{ maxHeight: 260, overflow: 'auto' }}>
      {elements.map(element => <ListItemButton key={element.id} selected={element.id === selectedId} onClick={() => onSelect(element.id)} sx={{ minHeight: 44, borderRadius: 1 }}>
        <ListItemIcon sx={{ color: element.color, minWidth: 36 }}><MapSymbol category={element.icon} /></ListItemIcon>
        <ListItemText primary={element.label} secondary={`${mapCategoryLabels[element.category]}${element.kind === 'path' ? ' · מסלול' : element.kind === 'area' ? ' · אזור' : ''}`} sx={{ overflowWrap: 'anywhere' }} />
      </ListItemButton>)}
    </List>
  </Box>;
}