import { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import GoldCard from '../components/GoldCard';
import MapButtons from '../components/MapButtons';
import EventMapCanvas from '../components/eventMap/EventMapCanvas';
import EventMapLegend from '../components/eventMap/EventMapLegend';
import { getEventMapBackground, getPublishedEventMap } from '../services/eventMap.service';
import type { PublishedEventMap } from '../types/eventMap';
import { useAppSelector } from '../store';
import { useWeddingInfo } from '../hooks/useWeddingInfo';
import { mapHasContent } from '../utils/eventMap';

export default function EventMapTab() {
    const identity = useAppSelector(state => state.auth.guest?.id);
    const [reload, setReload] = useState(0);
    useEffect(() => {
        const refresh = () => { if (document.visibilityState === 'visible') setReload(value => value + 1); };
        window.addEventListener('focus', refresh);
        document.addEventListener('visibilitychange', refresh);
        return () => { window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
    }, []);
    return <EventMapView key={`${identity}:${reload}`} onRetry={() => setReload(value => value + 1)} />;
}

function EventMapView({ onRetry }: { onRetry: () => void }) {
    const { info } = useWeddingInfo();
    const [data, setData] = useState<PublishedEventMap | null>(null);
    const [background, setBackground] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [imageError, setImageError] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    useEffect(() => () => { if (background) URL.revokeObjectURL(background); }, [background]);
    useEffect(() => {
        const controller = new AbortController();
        getPublishedEventMap(controller.signal).then(async result => {
            if (controller.signal.aborted) return;
            setData(result);
            if (result?.document.hasBackground) {
                try {
                    const url = await getEventMapBackground(false, result.revision, controller.signal);
                    if (controller.signal.aborted) URL.revokeObjectURL(url); else setBackground(url);
                } catch { if (!controller.signal.aborted) setImageError(true); }
            }
        }).catch(failure => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'לא ניתן לטעון את המפה'); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, []);
    const selected = data?.document.elements.find(element => element.id === selectedId);
    const hasCoordinates = info?.venue_lat != null && info?.venue_lng != null && Number.isFinite(Number(info.venue_lat)) && Number.isFinite(Number(info.venue_lng));
    const destination = hasCoordinates ? `${info!.venue_lat},${info!.venue_lng}` : info?.venue_address?.trim();
    return <Box dir="rtl" sx={{ p: { xs: 2, md: 3 } }}>
        <Typography component="h2" variant="h6" sx={{ mb: 2 }}>מפת האירוע</Typography>
        {loading ? <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress aria-label="טעינת מפת האירוע" /></Box>
            : error ? <Alert severity="error" action={<Button onClick={onRetry}>ניסיון נוסף</Button>}>{error}</Alert>
                : !data ? <Alert severity="info">מפת האירוע עדיין לא פורסמה</Alert>
                    : !mapHasContent(data.document) ? <Alert severity="info">אין פרטים להצגה במפה</Alert>
                        : <>
                            {imageError ? <Alert severity="warning" action={<Button onClick={onRetry}>ניסיון נוסף</Button>}>לא ניתן לטעון את רקע המפה</Alert>
                                : <EventMapCanvas document={data.document} background={background} selectedId={selectedId} onSelect={setSelectedId} onBackgroundError={() => setImageError(true)} />}
                            {selected && <Box role="region" aria-label="פרטי נקודה במפה" aria-live="polite" sx={{ my: 2, borderInlineStart: '4px solid', borderColor: selected.color, px: 2, overflowWrap: 'anywhere' }}><Typography component="h3" variant="subtitle1">{selected.label}</Typography><Typography sx={{ whiteSpace: 'pre-wrap' }}>{selected.note}</Typography></Box>}
                            <EventMapLegend elements={data.document.elements} selectedId={selectedId} onSelect={setSelectedId} />
                        </>}
        {info && destination && <GoldCard delay={0.2} sx={{ mt: 2, mb: 2 }}>
            <Typography component="h3" variant="subtitle1" sx={{ color: '#73552B', fontWeight: 700, mb: 2 }}>ניווט לאירוע</Typography>
            <MapButtons info={info} />
        </GoldCard>}
    </Box>;
}