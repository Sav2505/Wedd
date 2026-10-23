import { useEffect, useId } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Box, IconButton, Stack, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import { MapContainer, ImageOverlay, Marker, Polyline, Rectangle, useMap, useMapEvents } from 'react-leaflet';
import { CRS, divIcon, type LatLngBoundsExpression, type LeafletKeyboardEvent } from 'leaflet';
import type { EventMapDocument, MapElement, MapPoint } from '../../types/eventMap';
import { elementCenter, fromMapPosition, moveMapElement, toMapPosition } from '../../utils/eventMap';
import MapSymbol from './MapSymbol';

interface Props {
  document: EventMapDocument;
  background: string | null;
  selectedId: string | null;
  editable?: boolean;
  lockedView?: boolean;
  placing?: boolean;
  onSelect: (id: string) => void;
  onPlace?: (point: MapPoint) => void;
  onChange?: (element: MapElement) => void;
  onBackgroundError?: () => void;
  pendingPoints?: MapPoint[];
  pendingArea?: boolean;
}

function Viewport({ document, lockedView }: { document: EventMapDocument; lockedView?: boolean }) {
  const map = useMap();
  const { width, height } = document;
  const fit = () => map.fitBounds([[0, 0], [height, width]], { padding: [28, 28], animate: false });
  useEffect(() => {
    map.invalidateSize();
    map.fitBounds([[0, 0], [height, width]], { padding: [28, 28], animate: false });
    const observer = new ResizeObserver(() => {
      map.invalidateSize({ pan: false });
      if (lockedView) map.fitBounds([[0, 0], [height, width]], { padding: [28, 28], animate: false });
    });
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map, width, height, lockedView]);
  if (lockedView) return null;
  return <Stack direction="row" spacing={0.5} sx={{ position: 'absolute', top: 10, right: 10, zIndex: 800, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 2 }}>
    <Tooltip title="הגדלה"><IconButton aria-label="הגדלה" onClick={() => map.zoomIn(0.1)} sx={{ width: 44, height: 44 }}><AddIcon /></IconButton></Tooltip>
    <Tooltip title="הקטנה"><IconButton aria-label="הקטנה" onClick={() => map.zoomOut(0.1)} sx={{ width: 44, height: 44 }}><RemoveIcon /></IconButton></Tooltip>
    <Tooltip title="התאמה למפה כולה"><IconButton aria-label="התאמה למפה כולה" onClick={fit} sx={{ width: 44, height: 44 }}><FitScreenIcon /></IconButton></Tooltip>
  </Stack>;
}

function MapLayers({ document, background, selectedId, editable, placing, onSelect, onPlace, onChange, onBackgroundError, pendingPoints = [], pendingArea }: Props) {
  const patternId = `map-hatch-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  useMapEvents({ click(event) {
    if (editable && placing && event.latlng.lat >= 0 && event.latlng.lat <= document.height && event.latlng.lng >= 0 && event.latlng.lng <= document.width) {
      onPlace?.(fromMapPosition(event.latlng.lat, event.latlng.lng, document));
    }
  } });
  const bounds: LatLngBoundsExpression = [[0, 0], [document.height, document.width]];
  const selected = document.elements.find(element => element.id === selectedId);
  const selectedPoints = selected?.kind === 'path' ? selected.points : selected?.kind === 'area' ? selected.corners : [];
  const handleIcon = divIcon({ className: 'event-map-handle', iconSize: [44, 44], iconAnchor: [22, 22], html: '<div style="width:20px;height:20px;margin:12px;background:white;border:3px solid #263238;border-radius:50%;box-sizing:border-box"></div>' });
  return <>
    <svg width="0" height="0" aria-hidden="true"><defs><pattern id={patternId} width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="white" fillOpacity="0.3" /><path d="M-2,2 L2,-2 M0,8 L8,0 M6,10 L10,6" stroke="#263238" strokeOpacity="0.4" strokeWidth="1.5" /></pattern></defs></svg>
    {background && <ImageOverlay url={background} bounds={bounds} eventHandlers={{ error: () => onBackgroundError?.() }} />}
    {document.elements.filter(element => element.kind === 'area').map(element => element.kind === 'area' && <Rectangle
      key={element.id} bounds={element.corners.map(point => toMapPosition(point, document)) as [[number, number], [number, number]]}
      bubblingMouseEvents={false} pathOptions={{ color: element.color, weight: selectedId === element.id ? 5 : 3, dashArray: '4 4', fillColor: `url(#${patternId})`, fillOpacity: 0.65 }}
      eventHandlers={{ click: () => { if (!placing) onSelect(element.id); } }}
    />)}
    {document.elements.filter(element => element.kind === 'path').map(element => element.kind === 'path' && <Polyline
      key={element.id} positions={element.points.map(point => toMapPosition(point, document))} bubblingMouseEvents={false}
      pathOptions={{ color: element.color, weight: selectedId === element.id ? 8 : 6, dashArray: element.dashed ? '12 8' : undefined, lineCap: 'round' }}
      eventHandlers={{ click: () => { if (!placing) onSelect(element.id); } }}
    />)}
    {document.elements.map(element => element.kind === 'marker' && <Marker
      key={element.id}
      position={toMapPosition(element.point, document)}
      draggable={editable && !placing}
      keyboard
      autoPanOnFocus={false}
      title={element.label}
      alt={element.label}
      zIndexOffset={selectedId === element.id ? 1000 : 0}
      icon={divIcon({
        className: 'event-map-marker', iconSize: [44, 44], iconAnchor: [22, 22],
        html: renderToStaticMarkup(<div style={{ width: 44, height: 44, display: 'grid', placeItems: 'center' }}><div style={{ width: 30, height: 30, boxSizing: 'border-box', display: 'grid', placeItems: 'center', color: selectedId === element.id ? 'white' : element.color, background: selectedId === element.id ? element.color : 'white', borderRadius: '50%', border: `1.5px solid ${element.color}`, transform: selectedId === element.id ? 'scale(1.1)' : undefined, boxShadow: selectedId === element.id ? `0 0 0 4px ${element.color}33, 0 1px 4px #0002` : '0 1px 4px #0002' }}><MapSymbol category={element.icon} /></div></div>),
      })}
      eventHandlers={{
        click(event) { event.originalEvent.stopPropagation(); if (!placing) onSelect(element.id); },
        dragend(event) { const point = event.target.getLatLng(); onChange?.({ ...element, point: fromMapPosition(point.lat, point.lng, document) }); },
        keydown(event) {
          if (!editable || placing) return;
          const keyboard = (event as LeafletKeyboardEvent).originalEvent;
          const changes: Record<string, [number, number]> = { ArrowLeft: [-0.005, 0], ArrowRight: [0.005, 0], ArrowUp: [0, -0.005], ArrowDown: [0, 0.005] };
          const delta = changes[keyboard.key];
          if (!delta) return;
          keyboard.preventDefault(); keyboard.stopPropagation();
          onChange?.({ ...element, point: { x: Math.max(0, Math.min(1, element.point.x + delta[0])), y: Math.max(0, Math.min(1, element.point.y + delta[1])) } });
        },
      }}
    />)}
    {editable && !placing && selected && selectedPoints.map((point, index) => <Marker key={`${selected.id}-${index}`} position={toMapPosition(point, document)} icon={handleIcon} draggable title={`${selected.kind === 'area' ? 'פינה' : 'נקודה'} ${index + 1}`} alt={`נקודת עריכה ${index + 1}`} eventHandlers={{
      dragend(event) {
        const location = event.target.getLatLng();
        const next = fromMapPosition(location.lat, location.lng, document);
        if (selected.kind === 'path') onChange?.({ ...selected, points: selected.points.map((item, position) => position === index ? next : item) });
        if (selected.kind === 'area') onChange?.({ ...selected, corners: selected.corners.map((item, position) => position === index ? next : item) as [MapPoint, MapPoint] });
      },
    }} />)}
    {editable && !placing && selected && selected.kind !== 'marker' && <Marker position={toMapPosition(elementCenter(selected), document)} icon={divIcon({ className: 'event-map-handle', iconSize: [44, 44], iconAnchor: [22, 22], html: '<div style="width:28px;height:28px;margin:8px;background:white;border:2px solid #263238;border-radius:4px;text-align:center;line-height:24px;font-size:22px">↔</div>' })} draggable title="הזזת האלמנט כולו" alt="הזזת האלמנט כולו" eventHandlers={{ dragend(event) { const location = event.target.getLatLng(); onChange?.(moveMapElement(selected, fromMapPosition(location.lat, location.lng, document))); } }} />}
    {pendingPoints.length > 0 && <>
      <Polyline positions={pendingPoints.map(point => toMapPosition(point, document))} interactive={false} pathOptions={{ color: '#263238', dashArray: '6 6', weight: 4 }} />
      {pendingPoints.map((point, index) => <Marker key={index} position={toMapPosition(point, document)} icon={handleIcon} interactive={false} keyboard={false} />)}
      {pendingArea && pendingPoints.length === 2 && <Rectangle bounds={pendingPoints.map(point => toMapPosition(point, document)) as [[number, number], [number, number]]} interactive={false} />}
    </>}
  </>;
}

export default function EventMapCanvas(props: Props) {
  return <Box sx={{ position: 'relative', isolation: 'isolate', border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden', direction: 'ltr', height: { xs: 'min(58dvh, 520px)', md: 580 }, minHeight: 280,
    '& .leaflet-container': { width: '100%', height: '100%', bgcolor: '#F2F5F3', backgroundImage: 'linear-gradient(#176b5810 1px, transparent 1px), linear-gradient(90deg, #176b5810 1px, transparent 1px)', backgroundSize: '24px 24px', fontFamily: 'Heebo, sans-serif', cursor: props.placing ? 'crosshair' : undefined },
    '& .leaflet-interactive:focus-visible, & .event-map-marker:focus-visible': { outline: '3px solid #111', outlineOffset: 3 },
    '& .event-map-marker .MuiSvgIcon-root': { fontSize: 16, width: 16, height: 16 },
    '& .event-map-label': { direction: 'rtl', fontFamily: 'Heebo, sans-serif', borderRadius: '4px', color: '#263238', fontSize: '12px', maxWidth: 180, whiteSpace: 'normal', overflowWrap: 'anywhere' },
  }}>
    <MapContainer crs={CRS.Simple} center={[props.document.height / 2, props.document.width / 2]} zoom={-1} minZoom={-5} maxZoom={3} zoomSnap={0.1} zoomDelta={0.1} zoomControl={false} attributionControl={false} scrollWheelZoom={false} doubleClickZoom={false} zoomAnimation={false} dragging={!props.lockedView} touchZoom={!props.lockedView} boxZoom={!props.lockedView} keyboard={!props.lockedView}>
      <Viewport document={props.document} lockedView={props.lockedView} />
      <MapLayers {...props} />
    </MapContainer>
  </Box>;
}