import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, LinearProgress, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/SaveOutlined';
import UploadIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import PreviewIcon from '@mui/icons-material/VisibilityOutlined';
import PublishIcon from '@mui/icons-material/Publish';
import UnpublishIcon from '@mui/icons-material/VisibilityOffOutlined';
import PlaceIcon from '@mui/icons-material/AddLocationAltOutlined';
import SelectIcon from '@mui/icons-material/TouchAppOutlined';
import CheckIcon from '@mui/icons-material/Check';
import RouteIcon from '@mui/icons-material/Route';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import CloseIcon from '@mui/icons-material/Close';
import imageCompression from 'browser-image-compression';
import EventMapCanvas from '../../components/eventMap/EventMapCanvas';
import EventMapLegend from '../../components/eventMap/EventMapLegend';
import MapSymbol from '../../components/eventMap/MapSymbol';
import EventMapGeometryFields from '../../components/eventMap/EventMapGeometryFields';
import { getEventMapBackground, getEventMapDraft, publishEventMap, saveEventMap } from '../../services/eventMap.service';
import { emptyEventMap, mapCategoryLabels, mapHasContent } from '../../utils/eventMap';
import { mapColors, type EventMapDocument, type EventMapDraft, type MapCategory, type MapElement, type MapPoint, type MapTool } from '../../types/eventMap';
import { useAppSelector } from '../../store';

export interface EventMapEditorHandle { isDirty: boolean; save: () => Promise<boolean> }

const EventMapEditor = forwardRef<EventMapEditorHandle>(function EventMapEditor(_, ref) {
    const identity = useAppSelector(state => state.auth.guest?.id);
    const [saved, setSaved] = useState<EventMapDraft | null>(null);
    const [document, setDocument] = useState<EventMapDocument>(emptyEventMap);
    const [background, setBackground] = useState<string | null>(null);
    const [backgroundFailed, setBackgroundFailed] = useState(false);
    const [backgroundAction, setBackgroundAction] = useState<'keep' | 'replace' | 'remove'>('keep');
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(true);
    const [reload, setReload] = useState(0);
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [conflict, setConflict] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [tool, setTool] = useState<MapTool>('select');
    const [pendingPoints, setPendingPoints] = useState<MapPoint[]>([]);
    const [category, setCategory] = useState<MapCategory>('entrance');
    const [preview, setPreview] = useState(false);
    const [confirmation, setConfirmation] = useState<{ title: string; action: () => void } | null>(null);
    const mounted = useRef(true);
    const isDirty = saved !== null && (backgroundAction !== 'keep' || JSON.stringify(document) !== JSON.stringify(saved.document));
    const selected = document.elements.find(element => element.id === selectedId);

    useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    useEffect(() => () => { if (background) URL.revokeObjectURL(background); }, [background]);
    useEffect(() => {
        const controller = new AbortController();
        let imageUrl: string | null = null;
        setLoading(true); setSaved(null); setBackground(null); setError(''); setConflict(false); setNotice('');
        setDocument(emptyEventMap()); setFile(null); setBackgroundAction('keep'); setBackgroundFailed(false); setSelectedId(null); setTool('select');
        getEventMapDraft(controller.signal).then(async data => {
            if (controller.signal.aborted) return;
            setSaved(data); setDocument(data.document);
            if (data.document.hasBackground) {
                try { imageUrl = await getEventMapBackground(true, data.revision, controller.signal); }
                catch (failure) {
                    if (!controller.signal.aborted) { setBackgroundFailed(true); setError(failure instanceof Error ? failure.message : 'לא ניתן לטעון את הרקע'); }
                }
            }
            if (controller.signal.aborted) { if (imageUrl) URL.revokeObjectURL(imageUrl); return; }
            setBackground(imageUrl);
        }).catch(failure => {
            if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'לא ניתן לטעון את המפה');
        }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [identity, reload]);
    useEffect(() => {
        if (!isDirty) return;
        const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [isDirty]);

    function report(failure: unknown) {
        if (!mounted.current) return;
        setError(failure instanceof Error ? failure.message : 'הפעולה נכשלה');
        setConflict((failure as { status?: number })?.status === 409);
    }
    async function persist(): Promise<EventMapDraft | null> {
        if (!saved || busy) return null;
        if (!isDirty) return saved;
        setBusy(true); setError(''); setNotice(''); setProgress(0);
        try {
            const result = await saveEventMap(saved, document, backgroundAction, file, setProgress);
            if (!mounted.current) return null;
            setSaved(result); setDocument(result.document); setFile(null); setBackgroundAction('keep'); setNotice('הטיוטה נשמרה');
            return result;
        } catch (failure) { report(failure); return null; }
        finally { if (mounted.current) setBusy(false); }
    }
    useImperativeHandle(ref, () => ({ isDirty, save: async () => Boolean(await persist()) }));

    async function publication(publish: boolean) {
        if (!saved || busy) return;
        const snapshot = publish ? await persist() : saved;
        if (!snapshot || !mounted.current) return;
        setBusy(true); setError('');
        try {
            const result = await publishEventMap(snapshot, publish);
            if (!mounted.current) return;
            setSaved(result); setNotice(publish ? 'המפה פורסמה לאורחים' : 'פרסום המפה בוטל');
        } catch (failure) { report(failure); }
        finally { if (mounted.current) setBusy(false); }
    }
    async function chooseBackground(input: HTMLInputElement) {
        const original = input.files?.[0]; input.value = '';
        if (!original) return;
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(original.type) || original.size > 10 * 1024 * 1024) {
            setError('יש לבחור תמונת JPEG, PNG או WebP עד 10MB'); return;
        }
        setBusy(true); setError(''); setNotice('');
        try {
            const compressed = await imageCompression(original, { maxSizeMB: 4.8, maxWidthOrHeight: 4096, fileType: original.type, useWebWorker: true, initialQuality: 0.92 });
            const bitmap = await createImageBitmap(compressed);
            const { width, height } = bitmap; bitmap.close();
            if (width < 100 || height < 100 || width * height > 16_000_000 || compressed.size > 5 * 1024 * 1024) throw new Error('התמונה חייבת להיות לפחות 100 פיקסלים בכל צלע ועד 16 מיליון פיקסלים');
            if (!mounted.current) return;
            setBackground(URL.createObjectURL(compressed)); setBackgroundFailed(false); setFile(compressed); setBackgroundAction('replace');
            setDocument(current => ({ ...current, width, height, hasBackground: true }));
            setNotice('הרקע הוחלף בטיוטה. יש לבדוק את מיקום האלמנטים ולשמור');
        } catch (failure) { report(failure); }
        finally { if (mounted.current) setBusy(false); }
    }
    function update(element: MapElement) {
        setDocument(current => ({ ...current, elements: current.elements.map(item => item.id === element.id ? element : item) }));
    }
    function place(point: MapPoint) {
        if (tool === 'select' || document.elements.length >= 200) return;
        if (tool === 'path') { if (pendingPoints.length < 100) setPendingPoints(current => [...current, point]); return; }
        if (tool === 'area' && pendingPoints.length === 0) { setPendingPoints([point]); return; }
        if (tool === 'area' && (pendingPoints[0].x === point.x || pendingPoints[0].y === point.y)) return;
        addElement(tool === 'marker' ? { kind: 'marker', point } : { kind: 'area', corners: [pendingPoints[0], point] });
    }
    function addElement(geometry: { kind: 'marker'; point: MapPoint } | { kind: 'area'; corners: [MapPoint, MapPoint] } | { kind: 'path'; points: MapPoint[]; dashed: boolean }) {
        const element: MapElement = { id: crypto.randomUUID(), ...geometry, category, icon: category, label: mapCategoryLabels[category], note: '', color: mapColors[0] };
        setDocument(current => ({ ...current, elements: [...current.elements, element] })); setSelectedId(element.id); setTool('select');
        setPendingPoints([]);
    }
    const confirmReload = () => setConfirmation({ title: 'לטעון מחדש ולוותר על השינויים המקומיים?', action: () => setReload(current => current + 1) });

    if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress aria-label="טעינת מפת האירוע" /></Box>;
    if (!saved) return <Box sx={{ p: 3 }}><Alert severity="error">{error || 'לא ניתן לטעון את המפה'}</Alert><Button onClick={() => setReload(current => current + 1)}>ניסיון נוסף</Button></Box>;

    return <Box dir="rtl" sx={{ p: { xs: 2, md: 3 } }} onKeyDown={event => { if (event.key === 'Escape') { setTool('select'); setPendingPoints([]); } }}>
        <Stack direction="row" useFlexGap flexWrap="wrap" gap={1} alignItems="center" sx={{ mb: 2 }}>
            <Typography component="h2" variant="h6" sx={{ flexGrow: 1 }}>מפת האירוע</Typography>
            <Chip size="small" label={saved.publishedRevision === null ? 'טיוטה' : 'פורסם'} color={saved.publishedRevision === null ? 'default' : 'success'} />
            {isDirty && <Chip size="small" label="שינויים שלא נשמרו" color="warning" />}
            {saved.publishedRevision !== null && (saved.publishedRevision !== saved.revision || isDirty) && <Chip size="small" label="יש שינויים שלא פורסמו" variant="outlined" />}
        </Stack>
        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}{conflict && <Button onClick={confirmReload}>טעינת הגרסה העדכנית</Button>}</Alert>}
        {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
        {busy && <LinearProgress aria-label="שמירת המפה או הכנת הרקע" variant={progress > 0 ? 'determinate' : 'indeterminate'} value={progress} sx={{ mb: 2 }} />}
        <Box component="fieldset" disabled={busy} sx={{ m: 0, p: 0, border: 0, minWidth: 0, '&:disabled': { opacity: 0.65 } }}>
            <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
                <Button component="label" startIcon={<UploadIcon />} variant="outlined">{document.hasBackground ? 'החלפת רקע' : 'העלאת רקע'}<input hidden type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => void chooseBackground(event.currentTarget)} /></Button>
                {document.hasBackground && <Button startIcon={<DeleteIcon />} variant="outlined" color="error" onClick={() => setConfirmation({ title: 'למחוק את הרקע מהטיוטה? האלמנטים יישארו', action: () => { setDocument(current => ({ ...current, hasBackground: false })); setBackground(null); setBackgroundFailed(false); setFile(null); setBackgroundAction('remove'); } })}>מחיקת רקע</Button>}
                <Button startIcon={<SaveIcon />} variant="contained" disabled={!isDirty || busy || conflict} onClick={() => void persist()}>שמירה</Button>
                <Button startIcon={<PreviewIcon />} onClick={() => setPreview(true)}>תצוגה מקדימה</Button>
                {saved.publishedRevision === null
                    ? <Button startIcon={<PublishIcon />} disabled={!mapHasContent(document) || busy || conflict} onClick={() => void publication(true)}>פרסום</Button>
                    : <Button startIcon={<UnpublishIcon />} onClick={() => setConfirmation({ title: 'לבטל את פרסום המפה לאורחים?', action: () => void publication(false) })}>ביטול פרסום</Button>}
            </Stack>
            <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center" sx={{ mb: 2 }}>
                <ToggleButtonGroup exclusive size="small" value={tool} onChange={(_, next) => { if (next) { setTool(next); setPendingPoints([]); } }} aria-label="כלי עריכת מפה">
                    <ToggleButton value="select" aria-label="בחירה"><SelectIcon sx={{ mr: 0.5 }} />בחירה</ToggleButton>
                    <ToggleButton value="marker" aria-label="הוספת סמן" disabled={document.elements.length >= 200}><PlaceIcon sx={{ mr: 0.5 }} />סמן</ToggleButton>
                    <ToggleButton value="path" aria-label="הוספת מסלול" disabled={document.elements.length >= 200}><RouteIcon sx={{ mr: 0.5 }} />מסלול</ToggleButton>
                    <ToggleButton value="area" aria-label="הוספת אזור" disabled={document.elements.length >= 200}><CropSquareIcon sx={{ mr: 0.5 }} />אזור</ToggleButton>
                </ToggleButtonGroup>
                <TextField select size="small" label="סוג אלמנט חדש" value={category} onChange={event => setCategory(event.target.value as MapCategory)} sx={{ minWidth: 155, mt: 2 }}>
                    {Object.entries(mapCategoryLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                </TextField>
            </Stack>
            {tool === 'path' && <Stack direction="row" gap={1} sx={{ mb: 1 }}><Button startIcon={<CheckIcon />} disabled={pendingPoints.length < 2 || pendingPoints.every(point => point.x === pendingPoints[0]?.x && point.y === pendingPoints[0]?.y)} onClick={() => addElement({ kind: 'path', points: pendingPoints, dashed: true })}>סיום מסלול</Button><Button startIcon={<CloseIcon />} onClick={() => { setTool('select'); setPendingPoints([]); }}>ביטול</Button></Stack>}
            {tool === 'area' && pendingPoints.length === 1 && <Alert severity="info" sx={{ mb: 1 }}>בחירת הפינה הנגדית</Alert>}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pointerEvents: busy ? 'none' : undefined }}>
                <Box sx={{ minWidth: 0 }}>
                    {backgroundFailed && <Alert severity="warning" sx={{ mb: 1 }}>הרקע אינו זמין. יש לטעון מחדש או להחליף אותו<Button onClick={confirmReload}>טעינה מחדש</Button></Alert>}
                    {!backgroundFailed && <EventMapCanvas document={document} background={background} selectedId={selectedId} editable placing={tool !== 'select'} pendingPoints={pendingPoints} pendingArea={tool === 'area'} onSelect={setSelectedId} onPlace={place} onChange={update} onBackgroundError={() => setBackgroundFailed(true)} />}
                    <EventMapLegend elements={document.elements} selectedId={selectedId} onSelect={setSelectedId} />
                </Box>
                <Box sx={{ minWidth: 0, borderInlineStart: { md: '1px solid' }, borderColor: { md: 'divider' }, pl: { md: 2 } }}>
                    {selected ? <Stack gap={2}>
                        <Typography component="h3" variant="subtitle1">פרטי האלמנט</Typography>
                        <TextField size="small" label="שם" value={selected.label} slotProps={{ htmlInput: { maxLength: 80 } }} onChange={event => update({ ...selected, label: event.target.value })} />
                        <TextField select size="small" label="סוג" value={selected.category} onChange={event => update({ ...selected, category: event.target.value as MapCategory })}>{Object.entries(mapCategoryLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField>
                        <TextField select size="small" label="סמל" value={selected.icon} onChange={event => update({ ...selected, icon: event.target.value as MapCategory })}>{Object.entries(mapCategoryLabels).map(([value, label]) => <MenuItem key={value} value={value}><MapSymbol category={value as MapCategory} />{label}</MenuItem>)}</TextField>
                        <Stack direction="row" gap={0.5} flexWrap="wrap" aria-label="צבע האלמנט">{mapColors.map((color, index) => <Tooltip key={color} title={['ירוק', 'כחול', 'זהב כהה', 'אדום', 'סגול', 'פחם'][index]}><IconButton aria-label={`צבע ${['ירוק', 'כחול', 'זהב כהה', 'אדום', 'סגול', 'פחם'][index]}`} aria-pressed={selected.color === color} onClick={() => update({ ...selected, color })} sx={{ width: 36, height: 36, bgcolor: color, color: '#fff', '&:hover': { bgcolor: color } }}>{selected.color === color ? <CheckIcon fontSize="small" /> : <Box sx={{ width: 20, height: 20 }} />}</IconButton></Tooltip>)}</Stack>
                        <TextField size="small" label="הערה לאורחים" multiline minRows={3} value={selected.note} slotProps={{ htmlInput: { maxLength: 1000 } }} onChange={event => update({ ...selected, note: event.target.value })} />
                        <EventMapGeometryFields element={selected} onChange={update} />
                        <Button color="error" startIcon={<DeleteIcon />} onClick={() => setConfirmation({ title: `למחוק את ${selected.label || 'האלמנט'}?`, action: () => { setDocument(current => ({ ...current, elements: current.elements.filter(element => element.id !== selected.id) })); setSelectedId(null); } })}>מחיקת אלמנט</Button>
                    </Stack> : <Typography variant="body2" color="text.secondary">{tool === 'marker' ? 'הוספת סמן' : 'פרטי האלמנט'}</Typography>}
                </Box>
            </Box>
        </Box>
        <Dialog open={preview} onClose={() => setPreview(false)} fullWidth maxWidth="lg"><DialogTitle>תצוגה מקדימה לאורח · לא פורסם</DialogTitle><DialogContent><EventMapCanvas document={document} background={background} selectedId={selectedId} lockedView onSelect={setSelectedId} /><EventMapLegend elements={document.elements} selectedId={selectedId} onSelect={setSelectedId} />{selected && <Box sx={{ mt: 2, overflowWrap: 'anywhere' }}><Typography fontWeight={700}>{selected.label}</Typography><Typography sx={{ whiteSpace: 'pre-wrap' }}>{selected.note}</Typography></Box>}</DialogContent><DialogActions><Button onClick={() => setPreview(false)}>סגירה</Button></DialogActions></Dialog>
        <Dialog open={confirmation !== null} onClose={() => setConfirmation(null)}><DialogTitle>{confirmation?.title}</DialogTitle><DialogActions><Button onClick={() => setConfirmation(null)}>ביטול</Button><Button color="error" onClick={() => { const action = confirmation?.action; setConfirmation(null); action?.(); }}>אישור</Button></DialogActions></Dialog>
    </Box>;
});
export default EventMapEditor;