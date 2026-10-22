import { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControlLabel,
    IconButton,
    MenuItem,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography,
    useMediaQuery,
    useTheme,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DirectionsCarOutlinedIcon from '@mui/icons-material/DirectionsCarOutlined';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import {
    changeRidePostStatus,
    createRidePost,
    editRidePost,
    getRidePosts,
    removeRidePost,
    RidePostInput,
} from '../services/rides.service';
import { RideKind, RidePost } from '../types/domain';

interface RideCoordinationModalProps {
    open: boolean;
    onClose: () => void;
    receptionTime: string;
}

interface RideFormState {
    display_name: string;
    contact_phone: string;
    origin_text: string;
    time_from: string;
    time_to: string;
    seats_available: string;
    passenger_count: string;
    notes: string;
    consent: boolean;
}

type ListFilter = RideKind;

const emptyForm: RideFormState = {
    display_name: '',
    contact_phone: '',
    origin_text: '',
    time_from: '',
    time_to: '',
    seats_available: '4',
    passenger_count: '1',
    notes: '',
    consent: false,
};

function timeBeforeReception(receptionTime: string): string {
    const match = /^(\d{2}):(\d{2})/.exec(receptionTime);
    if (!match) return '';
    const minutes = (Number(match[1]) * 60 + Number(match[2]) + 23 * 60) % (24 * 60);
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

const statusLabels = {
    active: 'פעיל',
    full: 'מלאה',
    closed: 'נסגר',
    expired: 'פג תוקף',
} as const;

function formFromPost(post: RidePost): RideFormState {
    return {
        display_name: post.display_name,
        contact_phone: post.contact_phone ?? '',
        origin_text: post.origin_text,
        time_from: post.time_from,
        time_to: post.time_to ?? '',
        seats_available: String(post.seats_available ?? 1),
        passenger_count: String(post.passenger_count ?? 1),
        notes: post.notes ?? '',
        consent: false,
    };
}

function RidePostCard({
    post,
    onEdit,
    onStatus,
    onDelete,
}: {
    post: RidePost;
    onEdit: (post: RidePost) => void;
    onStatus: (post: RidePost, status: 'full' | 'closed') => void;
    onDelete: (post: RidePost) => void;
}) {
    const isOffer = post.kind === 'offer';
    const time = post.time_to ? `${post.time_from}–${post.time_to}` : post.time_from;

    return (
        <Box
            component="article"
            sx={{
                p: 2,
                border: `1px solid ${isOffer ? 'rgba(71,117,83,0.25)' : 'rgba(154,120,51,0.24)'}`,
                borderRight: `4px solid ${isOffer ? '#477553' : '#B38B3D'}`,
                borderRadius: 1.5,
                bgcolor: isOffer ? '#F5FAF6' : '#FFFBF2',
            }}
        >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                    <Box
                        aria-hidden="true"
                        sx={{
                            width: 36,
                            height: 36,
                            flexShrink: 0,
                            display: 'grid',
                            placeItems: 'center',
                            borderRadius: 1,
                            color: isOffer ? '#477553' : '#9A7833',
                            bgcolor: isOffer ? 'rgba(71,117,83,0.12)' : 'rgba(179,139,61,0.14)',
                        }}
                    >
                        {isOffer ? <DirectionsCarOutlinedIcon fontSize="small" /> : <SearchRoundedIcon fontSize="small" />}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography fontWeight={700} color={isOffer ? '#396344' : '#73552B'}>
                            {isOffer ? 'יש מקום ברכב' : 'מחפש/ת טרמפ'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {post.display_name} · {isOffer ? `יוצא/ת מ${post.origin_text}` : `איסוף מ${post.origin_text}`}
                        </Typography>
                    </Box>
                </Stack>
                <Stack alignItems="flex-end" spacing={0.5} flexShrink={0}>
                    <Chip size="small" label={statusLabels[post.status]} color={post.status === 'active' ? 'success' : 'default'} />
                </Stack>
            </Stack>
            <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" sx={{ mt: 1.25, color: '#66564A' }}>
                <Typography variant="body2">יציאה: {time}</Typography>
                <Typography variant="body2">
                    {isOffer ? `מקומות פנויים: ${post.seats_available}` : `נוסעים: ${post.passenger_count}`}
                </Typography>
            </Stack>
            {post.notes && <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{post.notes}</Typography>}
            {post.is_mine ? (
                <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 1.5 }}>
                    {(post.status === 'active' || post.status === 'full') && (
                        <Button size="small" startIcon={<EditOutlinedIcon />} onClick={() => onEdit(post)}>
                            עריכה
                        </Button>
                    )}
                    {post.status === 'active' && isOffer && (
                        <Button size="small" onClick={() => onStatus(post, 'full')}>סימון כמלאה</Button>
                    )}
                    {(post.status === 'active' || post.status === 'full') && (
                        <Button size="small" onClick={() => onStatus(post, 'closed')}>סגירה</Button>
                    )}
                    <IconButton size="small" aria-label="מחיקת הפרסום" onClick={() => onDelete(post)}>
                        <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                </Stack>
            ) : post.status === 'active' && post.whatsapp_url ? (
                <Button
                    component="a"
                    href={post.whatsapp_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    startIcon={<WhatsAppIcon />}
                    variant="outlined"
                    size="small"
                    sx={{ mt: 1.5, borderColor: '#5B8C62', color: '#3F7047' }}
                >
                    {isOffer ? 'בקש/י להצטרף' : 'הצע/י נסיעה'}
                </Button>
            ) : post.status === 'active' ? (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                    פרטי יצירת הקשר אינם זמינים כרגע.
                </Typography>
            ) : null}
        </Box>
    );
}

export default function RideCoordinationModal({ open, onClose, receptionTime }: RideCoordinationModalProps) {
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
    const [posts, setPosts] = useState<RidePost[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [filter, setFilter] = useState<ListFilter>('offer');
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<RidePost | null>(null);
    const [formKind, setFormKind] = useState<RideKind>('offer');
    const [form, setForm] = useState<RideFormState>(emptyForm);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return undefined;
        let cancelled = false;
        getRidePosts()
            .then((data) => { if (!cancelled) setPosts(data); })
            .catch((cause: Error) => { if (!cancelled) setError(cause.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [open]);

    const handleClose = () => {
        setLoading(true);
        setError('');
        setSuccess('');
        setFormOpen(false);
        setEditing(null);
        onClose();
    };

    const refresh = async () => {
        setLoading(true);
        setError('');
        try {
            setPosts(await getRidePosts());
        } catch (cause) {
            setError((cause as Error).message);
        } finally {
            setLoading(false);
        }
    };

    const openForm = (kind: RideKind, post: RidePost | null = null) => {
        setFormOpen(true);
        setEditing(post);
        setFormKind(kind);
        const nextForm = post ? formFromPost(post) : { ...emptyForm };
        if (!post && kind === 'request') nextForm.time_from = timeBeforeReception(receptionTime);
        setForm(nextForm);
        setError('');
        setSuccess('');
    };

    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        const input: RidePostInput = {
            kind: formKind,
            display_name: form.display_name,
            contact_phone: form.contact_phone,
            origin_text: form.origin_text,
            time_from: form.time_from,
            time_to: form.time_to || null,
            seats_available: formKind === 'offer' ? Number(form.seats_available) : null,
            passenger_count: formKind === 'request' ? Number(form.passenger_count) : null,
            notes: form.notes || null,
            consent: true,
        };
        try {
            if (editing) await editRidePost(editing.id, input);
            else await createRidePost(input);
            setPosts(await getRidePosts());
            setEditing(null);
            setFormOpen(false);
            setSuccess(editing ? 'הפרסום עודכן' : 'הפרסום נשמר');
        } catch (cause) {
            setError((cause as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const updateStatus = async (post: RidePost, status: 'full' | 'closed') => {
        setError('');
        try {
            await changeRidePostStatus(post.id, status);
            setPosts(await getRidePosts());
            setSuccess(status === 'full' ? 'הנסיעה סומנה כמלאה' : 'הפרסום נסגר');
        } catch (cause) {
            setError((cause as Error).message);
        }
    };

    const deletePost = async (post: RidePost) => {
        if (!window.confirm('למחוק את הפרסום?')) return;
        setError('');
        try {
            await removeRidePost(post.id);
            setPosts(await getRidePosts());
            setSuccess('הפרסום נמחק');
        } catch (cause) {
            setError((cause as Error).message);
        }
    };

    const filtered = posts.filter((post) => post.kind === filter);
    const otherPosts = filtered.filter((post) => !post.is_mine && (post.status === 'active' || post.status === 'full'));
    const myPosts = filtered.filter((post) => post.is_mine);

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            fullScreen={fullScreen}
            maxWidth="md"
            fullWidth
            dir="rtl"
            aria-labelledby="ride-dialog-title"
            sx={{
                '& .MuiDialog-paper': {
                    maxHeight: { xs: '100dvh', sm: 'calc(100% - 32px)' },
                    borderRadius: { xs: 0, sm: 2 },
                },
            }}
        >
            <DialogTitle id="ride-dialog-title" sx={{ pb: 1, pr: 3, pl: 2 }}>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1}>
                    <Box>
                        <Typography variant="h6" fontWeight={700} color="#73552B">מסתדרים יחד לנסיעה</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            מצאו טרמפ או הציעו בעצמכם :)
                        </Typography>
                    </Box>
                    <IconButton aria-label="סגירה" onClick={handleClose} size="small"><CloseRoundedIcon /></IconButton>
                </Stack>
            </DialogTitle>
            <DialogContent dividers sx={{ px: { xs: 2, sm: 3 }, py: 2.5 }}>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={refresh}>ניסיון נוסף</Button>}>
                        {error}
                    </Alert>
                )}
                {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

                {formOpen ? (
                    <Box component="form" onSubmit={submit}>
                        <Stack spacing={2}>
                            <Typography variant="subtitle1" fontWeight={700}>
                                {editing ? 'עריכת פרסום' : formKind === 'offer' ? 'הצעת נסיעה' : 'חיפוש טרמפ'}
                            </Typography>
                            <TextField
                                label="השם שיוצג לאורחים"
                                value={form.display_name}
                                onChange={(event) => setForm({ ...form, display_name: event.target.value })}
                                inputProps={{ maxLength: 80 }}
                                required
                                fullWidth
                            />
                            <TextField
                                label="טלפון ליצירת קשר"
                                value={form.contact_phone}
                                onChange={(event) => setForm({ ...form, contact_phone: event.target.value })}
                                placeholder="0541234567"
                                type="tel"
                                inputProps={{ maxLength: 24, dir: 'ltr', inputMode: 'tel' }}
                                required
                                fullWidth
                            />
                            <TextField
                                label={formKind === 'offer' ? 'אזור או נקודת מוצא' : 'אזור מבוקש'}
                                value={form.origin_text}
                                onChange={(event) => setForm({ ...form, origin_text: event.target.value })}
                                inputProps={{ maxLength: 120 }}
                                required
                                fullWidth
                            />
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <TextField
                                    label={formKind === 'offer' ? 'שעת יציאה משוערת' : 'שעת יציאה מועדפת'}
                                    type="time"
                                    value={form.time_from}
                                    onChange={(event) => setForm({ ...form, time_from: event.target.value })}
                                    InputLabelProps={{ shrink: true }}
                                    required
                                    fullWidth
                                />
                                <TextField
                                    label="עד שעה (לא חובה)"
                                    type="time"
                                    value={form.time_to}
                                    onChange={(event) => setForm({ ...form, time_to: event.target.value })}
                                    InputLabelProps={{ shrink: true }}
                                    fullWidth
                                />
                            </Stack>
                            {formKind === 'offer' ? (
                                <TextField
                                    select
                                    label="מקומות פנויים"
                                    value={form.seats_available}
                                    onChange={(event) => setForm({ ...form, seats_available: event.target.value })}
                                    fullWidth
                                >
                                    {Array.from({ length: 8 }, (_, index) => index + 1).map((count) => (
                                        <MenuItem key={count} value={String(count)}>{count}</MenuItem>
                                    ))}
                                </TextField>
                            ) : (
                                <TextField
                                    select
                                    label="מספר הנוסעים"
                                    value={form.passenger_count}
                                    onChange={(event) => setForm({ ...form, passenger_count: event.target.value })}
                                    fullWidth
                                >
                                    {Array.from({ length: 8 }, (_, index) => index + 1).map((count) => (
                                        <MenuItem key={count} value={String(count)}>{count}</MenuItem>
                                    ))}
                                </TextField>
                            )}
                            <TextField
                                label="מידע נוסף (לא חובה)"
                                value={form.notes}
                                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                                inputProps={{ maxLength: 500 }}
                                multiline
                                minRows={2}
                                fullWidth
                            />
                            <FormControlLabel
                                control={<Checkbox checked={form.consent} onChange={(event) => setForm({ ...form, consent: event.target.checked })} required />}
                                label="אני מאשר/ת שהשם ומס' הטלפון שהשארתי יוצגו לשאר האורחים"
                                sx={{ alignItems: 'center', '& .MuiFormControlLabel-label': { fontSize: '0.875rem', pt: 0.75 } }}
                            />
                            <Stack sx={{ justifyContent: 'flex-end' }} direction="row" spacing={1}>
                                <Button onClick={() => { setFormOpen(false); setEditing(null); }} disabled={saving}>חזרה לרשימה</Button>
                                <Button type="submit" variant="contained" disabled={saving || !form.consent} sx={{ bgcolor: '#9A7833' }}>
                                    {saving ? <CircularProgress size={22} color="inherit" /> : editing ? 'שמירת שינויים' : 'פרסום'}
                                </Button>
                            </Stack>
                        </Stack>
                    </Box>
                ) : (
                    <Stack spacing={2.5}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                            <Button startIcon={<DirectionsCarOutlinedIcon />} variant="contained" onClick={() => openForm('offer')} sx={{ bgcolor: '#9A7833' }}>
                                הצעת נסיעה
                            </Button>
                            <Button startIcon={<SearchRoundedIcon />} variant="outlined" onClick={() => openForm('request')} sx={{ color: '#73552B', borderColor: '#B99B5F' }}>
                                חיפוש טרמפ
                            </Button>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                            התיאום הסופי נעשה ישירות בין האורחים
                        </Typography>
                        <Tabs value={filter} onChange={(_event, value: ListFilter) => setFilter(value)} variant="fullWidth" aria-label="סוג פרסומי נסיעות">
                            <Tab value="offer" label="הצעות" />
                            <Tab value="request" label="בקשות" />
                        </Tabs>
                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
                        ) : (
                            <>
                                <Box>
                                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.25 }}>
                                        {filter === 'offer' ? 'הצעות נסיעה' : 'בקשות לטרמפ'}
                                    </Typography>
                                    {otherPosts.length ? (
                                        <Stack spacing={1.25}>
                                            {otherPosts.map((post) => <RidePostCard key={post.id} post={post} onEdit={(item) => openForm(item.kind, item)} onStatus={updateStatus} onDelete={deletePost} />)}
                                        </Stack>
                                    ) : error ? null : (
                                        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                                            {filter === 'offer'
                                                ? 'עדיין אין הצעות נסיעה. אולי יש לך מקום פנוי?'
                                                : 'עדיין אין בקשות לטרמפ. אפשר לפרסם בקשה משלך.'}
                                        </Typography>
                                    )}
                                </Box>
                                {myPosts.length > 0 && (
                                    <>
                                        <Divider />
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.25 }}>הפרסומים שלי</Typography>
                                            <Stack spacing={1.25}>
                                                {myPosts.map((post) => <RidePostCard key={post.id} post={post} onEdit={(item) => openForm(item.kind, item)} onStatus={updateStatus} onDelete={deletePost} />)}
                                            </Stack>
                                        </Box>
                                    </>
                                )}
                            </>
                        )}
                    </Stack>
                )}
            </DialogContent>
            {!formOpen && <DialogActions sx={{ px: 2.5, py: 1.5 }}><Button onClick={handleClose}>סגירה</Button></DialogActions>}
        </Dialog>
    );
}