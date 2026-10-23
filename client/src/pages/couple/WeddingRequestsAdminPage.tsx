import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import DraftsOutlinedIcon from '@mui/icons-material/DraftsOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import {
    listWeddingRequests,
    openWedding,
    sendFirstContactMail,
} from '../../services/weddingRequestsAdmin.service';
import { listAdminGuestCustomMessages, reviewGuestCustomMessage } from '../../services/guestCustomMessages.service';
import { GuestCustomMessageRequest, WeddingRequest } from '../../types/domain';

function formatDate(value: string): string {
    const date = new Date(value.includes('T') ? value : `${value}T12:00:00`);
    return date.toLocaleDateString('he-IL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function statusLabel(status: WeddingRequest['status']): { text: string; color: 'warning' | 'success' | 'default' } {
    if (status === 'new') return { text: 'חדש', color: 'warning' };
    if (status === 'confirmed') return { text: 'מאושר', color: 'success' };
    return { text: 'בוטל', color: 'default' };
}

function formatOptionalDate(value?: string | null): string {
    if (!value) return '—';
    return formatDate(value);
}

function guestMessageStatus(status: GuestCustomMessageRequest['status']): { label: string; color: 'default' | 'warning' | 'success' | 'error' } {
    if (status === 'pending_approval') return { label: 'ממתינה לאישור', color: 'warning' };
    if (status === 'approved') return { label: 'אושרה', color: 'success' };
    if (status === 'rejected') return { label: 'נדחתה', color: 'error' };
    if (status === 'sending') return { label: 'נשלחת', color: 'warning' };
    if (status === 'sent') return { label: 'נשלחה', color: 'success' };
    if (status === 'sent_with_errors') return { label: 'נשלחה חלקית', color: 'error' };
    return { label: 'פג תוקף', color: 'default' };
}

function guestMessageAudience(audience: GuestCustomMessageRequest['audience']): string {
    if (audience === 'COMING') return 'אישרו הגעה';
    if (audience === 'PENDING') return 'טרם אישרו';
    return 'כולם';
}

export default function WeddingRequestsAdminPage() {
    const [items, setItems] = useState<WeddingRequest[]>([]);
    const [guestMessages, setGuestMessages] = useState<GuestCustomMessageRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [sendingId, setSendingId] = useState<number | null>(null);
    const [openingId, setOpeningId] = useState<number | null>(null);
    const [openDialog, setOpenDialog] = useState<{ requestId: number; title: string } | null>(null);
    const [note, setNote] = useState('');
    const [reviewDialog, setReviewDialog] = useState<{ id: string; decision: 'approved' | 'rejected' } | null>(null);
    const [reviewNote, setReviewNote] = useState('');
    const [reviewingId, setReviewingId] = useState<string | null>(null);

    const sortedItems = useMemo(() => items, [items]);

    async function loadData() {
        try {
            setLoading(true);
            setError(null);
            const [rows, messageRows] = await Promise.all([
                listWeddingRequests(),
                listAdminGuestCustomMessages(),
            ]);
            setItems(rows);
            setGuestMessages(messageRows);
        } catch (err: any) {
            setError(err.message ?? 'שגיאה בטעינת הבקשות');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    async function onSendFirstContact(requestId: number) {
        try {
            setMessage(null);
            setSendingId(requestId);
            const result = await sendFirstContactMail(requestId);
            setItems((prev) => prev.map((row) => (row.id === requestId ? result.request : row)));
            setMessage(`מייל ראשוני נשלח בהצלחה.`);
        } catch (err: any) {
            setError(err.message ?? 'שגיאה בשליחת מייל ראשוני');
        } finally {
            setSendingId(null);
        }
    }

    async function onConfirmOpenWedding() {
        if (!openDialog) return;

        try {
            setMessage(null);
            setOpeningId(openDialog.requestId);
            const result = await openWedding(openDialog.requestId, note.trim() || undefined);
            setItems((prev) => prev.map((row) => (row.id === openDialog.requestId ? result.request : row)));

            const credentialsSummary = result.credentials
                .map((cred) => `${cred.side}: ${cred.full_name} (${cred.code})`)
                .join(' | ');

            setMessage(`החתונה נפתחה בהצלחה. ${credentialsSummary}`);
            setOpenDialog(null);
            setNote('');
        } catch (err: any) {
            setError(err.message ?? 'שגיאה בפתיחת חתונה');
        } finally {
            setOpeningId(null);
        }
    }

    async function onReviewGuestMessage() {
        if (!reviewDialog) return;
        try {
            setError(null);
            setReviewingId(reviewDialog.id);
            const result = await reviewGuestCustomMessage(
                reviewDialog.id,
                reviewDialog.decision,
                reviewNote.trim() || undefined,
            );
            setGuestMessages((current) => current.map((item) => (
                item.id === reviewDialog.id ? { ...item, ...result.request } : item
            )));
            setMessage(reviewDialog.decision === 'approved'
                ? result.couple_notification_sent ? 'הבקשה אושרה ונשלח מייל לזוג.' : 'הבקשה אושרה, אך מייל לזוג לא נשלח.'
                : 'הבקשה נדחתה וההערה נשמרה.');
            setReviewDialog(null);
            setReviewNote('');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'עדכון בקשת ההודעה נכשל');
        } finally {
            setReviewingId(null);
        }
    }

    return (
        <Box sx={{ pb: 6, px: { xs: 1, sm: 2 }, pt: 1, maxWidth: 1400, mx: 'auto', width: '100%', direction: 'ltr' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mb: 2.5, mt: 1, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <ManageAccountsOutlinedIcon sx={{ color: 'primary.main', fontSize: 32 }} />
                    <Box>
                        <Typography
                            variant="h5"
                            sx={{ fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 700, lineHeight: 1.15 }}
                        >
                            בקשות הרשמה
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            שליחת מייל ראשוני ופתיחת חתונה לזוגות חדשים
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {message && (
                <Alert severity="success" sx={{ mb: 1.5 }} onClose={() => setMessage(null)}>
                    {message}
                </Alert>
            )}

            {!loading && (
                <Box sx={{ mb: 2.5 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                        <WhatsAppIcon sx={{ color: '#168A43' }} />
                        <Typography variant="h6" sx={{ fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 700 }}>
                            בקשות הודעות לאורחים
                        </Typography>
                        <Chip size="small" label={guestMessages.filter((item) => item.status === 'pending_approval').length} color="warning" />
                    </Stack>
                    {guestMessages.length === 0 ? (
                        <Paper sx={{ p: 2, borderRadius: 1.5, border: '1px solid rgba(201,168,76,0.25)' }}>
                            <Typography variant="body2" color="text.secondary">אין בקשות הודעות לאורחים.</Typography>
                        </Paper>
                    ) : (
                        <TableContainer component={Paper} sx={{ borderRadius: 1.5, overflowX: 'auto', border: '1px solid rgba(201,168,76,0.25)' }}>
                            <Table size="small" sx={{ minWidth: 1150 }}>
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>הזוג</TableCell>
                                        <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>קהל</TableCell>
                                        <TableCell sx={{ fontWeight: 700, minWidth: 280 }}>תוכן ההודעה</TableCell>
                                        <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>מועד שליחה</TableCell>
                                        <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>סטטוס</TableCell>
                                        <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>מסירה</TableCell>
                                        <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>הערת אדמין</TableCell>
                                        <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>פעולות</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {guestMessages.map((item) => {
                                        const status = guestMessageStatus(item.status);
                                        const busy = reviewingId === item.id;
                                        return (
                                            <TableRow key={item.id} hover>
                                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{item.bride_name} ו{item.groom_name}</TableCell>
                                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{guestMessageAudience(item.audience)}</TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', maxHeight: 120, overflowY: 'auto' }}>
                                                        {item.message_body}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(item.scheduled_at)}</TableCell>
                                                <TableCell><Chip size="small" label={status.label} color={status.color} /></TableCell>
                                                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                                    {item.sent_count ?? 0}/{item.recipient_count ?? 0}
                                                    {(item.failed_count ?? 0) > 0 ? ` · נכשלו ${item.failed_count}` : ''}
                                                </TableCell>
                                                <TableCell sx={{ maxWidth: 180, whiteSpace: 'pre-wrap' }}>{item.admin_note || '—'}</TableCell>
                                                <TableCell>
                                                    {item.status === 'pending_approval' ? (
                                                        <Stack direction="row" spacing={0.5}>
                                                            <Tooltip title="אישור הבקשה">
                                                                <span><IconButton size="small" color="success" disabled={busy} onClick={() => {
                                                                    setReviewNote('');
                                                                    setReviewDialog({ id: item.id, decision: 'approved' });
                                                                }}><CheckCircleOutlineIcon fontSize="small" /></IconButton></span>
                                                            </Tooltip>
                                                            <Tooltip title="דחייה והוספת הערה">
                                                                <span><IconButton size="small" color="error" disabled={busy} onClick={() => {
                                                                    setReviewNote('');
                                                                    setReviewDialog({ id: item.id, decision: 'rejected' });
                                                                }}><BlockOutlinedIcon fontSize="small" /></IconButton></span>
                                                            </Tooltip>
                                                        </Stack>
                                                    ) : '—'}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Box>
            )}

            {loading ? (
                <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 220 }}>
                    <CircularProgress size={34} />
                </Box>
            ) : sortedItems.length === 0 ? (
                <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 3, border: '1px solid rgba(201,168,76,0.25)' }}>
                    <ManageAccountsOutlinedIcon sx={{ fontSize: 46, opacity: 0.25, mb: 1, color: 'primary.main' }} />
                    <Typography sx={{ color: '#816A52' }}>אין כרגע בקשות הרשמה להצגה.</Typography>
                </Paper>
            ) : (
                <>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        ניתן לגלול אופקית בתוך הטבלה כדי לראות את כל העמודות.
                    </Typography>

                    <TableContainer
                        component={Paper}
                        sx={{
                            borderRadius: 1.5,
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
                            border: '1px solid rgba(201,168,76,0.25)',
                            overflowX: 'auto',
                            overflowY: 'hidden',
                            WebkitOverflowScrolling: 'touch',
                            '& .MuiTableCell-root': { fontSize: '0.85rem' },
                        }}
                    >
                        <Table stickyHeader size="small" sx={{ minWidth: 1140 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'rgba(201,168,76,0.08)' }}>מזהה</TableCell>
                                    <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'rgba(201,168,76,0.08)' }}>חתן</TableCell>
                                    <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'rgba(201,168,76,0.08)' }}>כלה</TableCell>
                                    <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'rgba(201,168,76,0.08)' }}>אימייל</TableCell>
                                    <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'rgba(201,168,76,0.08)' }}>תאריך חתונה</TableCell>
                                    <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'rgba(201,168,76,0.08)' }}>סטטוס</TableCell>
                                    <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'rgba(201,168,76,0.08)' }}>טלפון</TableCell>
                                    <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'rgba(201,168,76,0.08)' }}>עדכון אחרון</TableCell>
                                    <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'rgba(201,168,76,0.08)' }}>נפתחה ב־</TableCell>
                                    <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'rgba(201,168,76,0.08)' }}>מייל ראשוני</TableCell>
                                    <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'rgba(201,168,76,0.08)' }}>פעולות</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sortedItems.map((row) => {
                                    const status = statusLabel(row.status);
                                    const isOpening = openingId === row.id;
                                    const isSending = sendingId === row.id;
                                    return (
                                        <TableRow key={row.id} hover>
                                            <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>{row.id}</TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 140 }}>
                                                    {row.groom_name}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 140 }}>
                                                    {row.bride_name}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" noWrap sx={{ maxWidth: 220 }}>
                                                    {row.email}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>{formatDate(row.wedding_date)}</TableCell>
                                            <TableCell>
                                                <Chip label={status.text} color={status.color} size="small" sx={{ fontWeight: 600, fontSize: '0.73rem' }} />
                                            </TableCell>
                                            <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.phone_number}</TableCell>
                                            <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>{formatDate(row.updated_at)}</TableCell>
                                            <TableCell>
                                                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ whiteSpace: 'nowrap' }}>
                                                    {row.opened_at ? (
                                                        <CheckCircleOutlineIcon fontSize="small" sx={{ color: 'success.main' }} />
                                                    ) : row.status === 'cancelled' ? (
                                                        <BlockOutlinedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                                                    ) : (
                                                        <LockOpenOutlinedIcon fontSize="small" sx={{ color: 'warning.main' }} />
                                                    )}
                                                    <Typography variant="body2" color="text.secondary">
                                                        {formatOptionalDate(row.opened_at)}
                                                    </Typography>
                                                </Stack>
                                            </TableCell>
                                            <TableCell>
                                                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ whiteSpace: 'nowrap' }}>
                                                    {row.first_contact_sent_at ? (
                                                        <DraftsOutlinedIcon fontSize="small" sx={{ color: 'success.main' }} />
                                                    ) : (
                                                        <EmailOutlinedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                                                    )}
                                                    <Typography variant="body2" color="text.secondary">
                                                        {formatOptionalDate(row.first_contact_sent_at)}
                                                    </Typography>
                                                </Stack>
                                            </TableCell>
                                            <TableCell>
                                                <Stack direction="row" spacing={0.5}>
                                                    <Tooltip title="שליחת מייל ראשוני">
                                                        <span>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => onSendFirstContact(row.id)}
                                                                disabled={isSending || isOpening}
                                                                sx={{ color: 'primary.main' }}
                                                            >
                                                                <EmailOutlinedIcon fontSize="small" />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                    <Tooltip title={row.opened_at ? 'החתונה כבר נפתחה' : 'פתח חתונה'}>
                                                        <span>
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => setOpenDialog({ requestId: row.id, title: `${row.bride_name} & ${row.groom_name}` })}
                                                                disabled={isOpening || row.status === 'cancelled' || Boolean(row.opened_at)}
                                                                sx={{ color: row.opened_at ? 'text.disabled' : 'success.main' }}
                                                            >
                                                                <LockOpenOutlinedIcon fontSize="small" />
                                                            </IconButton>
                                                        </span>
                                                    </Tooltip>
                                                </Stack>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Divider sx={{ my: 1.5, borderColor: 'rgba(201,168,76,0.18)' }} />
                    <Typography variant="caption" color="text.secondary">
                        מוצגות {sortedItems.length} בקשות הרשמה.
                    </Typography>
                </>
            )}

            <Dialog open={Boolean(openDialog)} onClose={() => setOpenDialog(null)} fullWidth maxWidth="sm">
                <DialogTitle>אישור פתיחת חתונה</DialogTitle>
                <DialogContent>
                    <Typography sx={{ mb: 1.5 }}>
                        הפעולה תיצור שני משתמשי COUPLE ותשלח מייל עם פרטי כניסה.
                        {openDialog ? ` עבור: ${openDialog.title}.` : ''}
                    </Typography>
                    <TextField
                        fullWidth
                        label="הערה פנימית (אופציונלי)"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        multiline
                        minRows={2}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(null)}>ביטול</Button>
                    <Button variant="contained" onClick={onConfirmOpenWedding} disabled={openingId !== null}>
                        פתח חתונה
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog open={Boolean(reviewDialog)} onClose={() => reviewingId ? undefined : setReviewDialog(null)} fullWidth maxWidth="sm">
                <DialogTitle>{reviewDialog?.decision === 'approved' ? 'אישור הודעה לאורחים' : 'דחיית בקשה והערה לזוג'}</DialogTitle>
                <DialogContent>
                    {reviewDialog?.decision === 'rejected' ? (
                        <TextField
                            autoFocus
                            fullWidth
                            multiline
                            minRows={3}
                            label="הערה שתוצג לזוג"
                            value={reviewNote}
                            onChange={(event) => setReviewNote(event.target.value)}
                            sx={{ mt: 1 }}
                        />
                    ) : (
                        <Typography sx={{ mt: 1 }}>ההודעה תישלח במועד שנבחר, כל עוד הסכמת WhatsApp של הזוג בתוקף.</Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setReviewDialog(null)} disabled={reviewingId !== null}>ביטול</Button>
                    <Button
                        variant="contained"
                        color={reviewDialog?.decision === 'approved' ? 'success' : 'error'}
                        onClick={onReviewGuestMessage}
                        disabled={reviewingId !== null}
                    >
                        {reviewingId ? <CircularProgress size={18} color="inherit" /> : reviewDialog?.decision === 'approved' ? 'אישור' : 'דחיית בקשה'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
