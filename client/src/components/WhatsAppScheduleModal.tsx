import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SaveIcon from '@mui/icons-material/Save';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Collapse } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
    deleteWeddingInvitationImage,
    fetchWeddingInvitationImageBlob,
    getWeddingMessageSchedule,
    patchWeddingMessageSchedule,
    uploadWeddingInvitationImage,
} from '../services/weddingMessageSchedule.service';
import { WeddingMessageSchedule } from '../types/domain';
import { computeSchedulePreview, formatScheduleDateTime } from '../utils/scheduling.util';
import LoadingOverlay from './LoadingOverlay';

interface Props {
    open: boolean;
    weddingId: number;
    weddingDate?: string;
    onClose: () => void;
}

export default function WhatsAppScheduleModal({ open, weddingId, weddingDate, onClose }: Props) {
    const [schedule, setSchedule] = useState<WeddingMessageSchedule | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
    const [result, setResult] =
        useState<'success' | 'error' | null>(null);
    const [resultMessage, setResultMessage] = useState('');
    const [invitationDays, setInvitationDays] = useState(30);
    const [reminderDays, setReminderDays] = useState(14);
    const [dayBeforeDays, setDayBeforeDays] = useState(1);
    const [previewOpen, setPreviewOpen] = useState<{ invitation: boolean; reminder: boolean; dayBefore: boolean, thankYou: boolean }>({
        invitation: false,
        reminder: false,
        dayBefore: false,
        thankYou: false,
    });
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const canLoad = open && weddingId > 0;

    useEffect(() => {
        if (!canLoad) return;

        let active = true;
        setLoading(true);

        getWeddingMessageSchedule(weddingId)
            .then(async (data) => {
                if (!active) return;
                setSchedule(data);
                setInvitationDays(data.invitation_days_before);
                setReminderDays(data.reminder_days_before);
                setDayBeforeDays(data.day_before_offset_days);

                if (data.has_invitation_image) {
                    const blob = await fetchWeddingInvitationImageBlob(weddingId);
                    if (!active) return;
                    if (blob) {
                        const objectUrl = URL.createObjectURL(blob);
                        setImagePreviewUrl((prev) => {
                            if (prev) URL.revokeObjectURL(prev);
                            return objectUrl;
                        });
                    } else {
                        setImagePreviewUrl(null);
                    }
                } else {
                    setImagePreviewUrl(null);
                }
            })
            .catch((err) => {
                if (!active) return;
                setResult('error');
                setResultMessage(
                    err instanceof Error
                        ? err.message
                        : 'שגיאה בטעינת הגדרות תזמון'
                );
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [canLoad, weddingId]);

    useEffect(() => {
        return () => {
            if (imagePreviewUrl) {
                URL.revokeObjectURL(imagePreviewUrl);
            }
        };
    }, [imagePreviewUrl]);

    function togglePreview(key: 'invitation' | 'reminder' | 'dayBefore') {
        setPreviewOpen((p) => ({ ...p, [key]: !p[key] }));
    }

    const previewDates = useMemo(() => {
        if (!weddingDate) return null;
        try {
            return computeSchedulePreview(weddingDate, {
                invitation_days_before: invitationDays,
                reminder_days_before: reminderDays,
                day_before_offset_days: dayBeforeDays,
            });
        } catch {
            return null;
        }
    }, [weddingDate, invitationDays, reminderDays, dayBeforeDays]);

    const invitationLocked = Boolean(schedule?.invitation_locked_at);
    const reminderLocked = Boolean(schedule?.reminder_locked_at);
    const dayBeforeLocked = Boolean(schedule?.day_before_locked_at);

    async function handleSave() {
        if (!schedule) return;

        setSaving(true);
        setLoadingMessage('שומר את ההגדרות...');

        try {
            const updated = await patchWeddingMessageSchedule(weddingId, {
                invitation_days_before: invitationLocked ? undefined : invitationDays,
                reminder_days_before: reminderLocked ? undefined : reminderDays,
                day_before_offset_days: dayBeforeLocked ? undefined : dayBeforeDays,
            });
            setSchedule(updated);
            setResult('success');
            setResultMessage('הגדרות התזמון נשמרו בהצלחה');
        } catch (err) {
            setResult('error');
            setResultMessage(
                err instanceof Error
                    ? err.message
                    : 'שגיאה בשמירת הגדרות תזמון'
            );

        } finally {
            setSaving(false);
            setLoadingMessage(null);
        }
    }

    async function handleUploadImage(file: File) {
        if (!schedule) return;
        setSaving(true);
        setLoadingMessage('מעלה את תמונת ההזמנה ל-WhatsApp...');

        try {
            const updated = await uploadWeddingInvitationImage(weddingId, file);
            setSchedule(updated);
            const blob = await fetchWeddingInvitationImageBlob(weddingId);
            if (blob) {
                const objectUrl = URL.createObjectURL(blob);
                setImagePreviewUrl((prev) => {
                    if (prev) URL.revokeObjectURL(prev);
                    return objectUrl;
                });
            }
            setResult('success');
            setResultMessage('תמונת ההזמנה נשמרה בהצלחה');
        } catch (err) {
            setResult('error');
            setResultMessage(
                err instanceof Error
                    ? err.message
                    : 'שגיאה בהעלאת תמונת ההזמנה'
            );
        } finally {
            setSaving(false);
            setLoadingMessage(null);
        }
    }

    async function handleDeleteImage() {
        setSaving(true);
        setLoadingMessage('מוחק את תמונת ההזמנה...');

        try {
            const updated = await deleteWeddingInvitationImage(weddingId);
            setSchedule(updated);
            setImagePreviewUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return null;
            });
            setResult('success');
            setResultMessage('תמונת ההזמנה נמחקה בהצלחה');
        } catch (err) {
            setResult('error');
            setResultMessage(
                err instanceof Error
                    ? err.message
                    : 'שגיאה במחיקת תמונת ההזמנה'
            );
        } finally {
            setSaving(false);
        }
    }

    const displayInvitationDate = previewDates?.invitation_send_at ?? schedule?.invitation_send_at;
    const displayReminderDate = previewDates?.reminder_send_at ?? schedule?.reminder_send_at;
    const displayDayBeforeDate = previewDates?.day_before_send_at ?? schedule?.day_before_send_at;

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogTitle sx={{ fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 700 }}>
                הגדרות תזמון הודעות WhatsApp לאורחים
            </DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ mt: 0.5 }}>
                    <Typography sx={{ ml: 3, fontWeight: 400, color: '#302209', fontSize: "14px" }}>תקבלו למייל כמובן עדכון 24 שעות טרם שליחת ההודעות</Typography>

                    {loading || !schedule ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                            <CircularProgress sx={{ color: '#C9A84C' }} />
                        </Box>
                    ) : (
                        <>
                            <Stack spacing={1.5}>
                                <Typography sx={{ fontWeight: 700, color: '#6E5424' }}>הזמנה ראשונית - <span style={{ fontWeight: "normal" }}>לכולם</span></Typography>
                                <TextField
                                    type="number"
                                    label="כמה ימים מראש"
                                    value={invitationDays}
                                    disabled={invitationLocked || saving}
                                    onChange={(e) => setInvitationDays(Math.max(0, Number(e.target.value || 0)))}
                                    size="small"
                                    inputProps={{ min: 0 }}
                                />
                                <Typography variant="body2" sx={{ color: '#5A4A2A' }}>
                                    תאריך שליחה מחושב: {displayInvitationDate ? formatScheduleDateTime(displayInvitationDate) : '-'}
                                </Typography>
                                {invitationLocked && (
                                    <Alert severity="warning" sx={{ py: 0 }}>
                                        ההודעה כבר נשלחה בתאריך {formatScheduleDateTime(schedule.invitation_locked_at!)} ולא ניתנת עוד לעריכה.
                                    </Alert>
                                )}
                                <Button
                                    size="small"
                                    onClick={() => togglePreview('invitation')}
                                    endIcon={
                                        <ExpandMoreIcon
                                            sx={{
                                                transform: previewOpen.invitation ? 'rotate(180deg)' : 'none',
                                                transition: 'transform 0.2s',
                                            }}
                                        />
                                    }
                                    sx={{ alignSelf: 'flex-start', color: '#1f9f51', fontWeight: 600, fontSize: '0.78rem' }}
                                >
                                    {previewOpen.invitation ? 'הסתרת תצוגה מקדימה' : 'הצגת תצוגה מקדימה'}
                                </Button>
                                <Collapse in={previewOpen.invitation} timeout="auto" unmountOnExit>
                                    <WhatsAppBubblePreview
                                        image={imagePreviewUrl ?? undefined}
                                        header="שלום יואב! 💌"
                                        body={
                                            `בשמחה ובהתרגשות גדולה,
                                            אנו מזמינים אותך לקחת חלק ביום המאושר בחיינו! 💍✨

                                            📅 מועד האירוע: יום שני, 07 בדצמבר 2026
                                            🥂 קבלת פנים: 19:30
                                            ⛪ חופה: 20:30

                                            נשמח מאוד אם תאשר/י את הגעתך באמצעות הכפתור למטה, כדי שנוכל להיערך בצורה הטובה ביותר. 🙏

                                            מחכים להתרגש, לשמוח ולחגוג איתך 🥂❤️

                                            באהבה,
                                            שחר & דן 💕`
                                        }
                                        buttonLabel="לאישור הגעה"
                                    />
                                </Collapse>
                            </Stack>

                            <Stack spacing={1.5}>
                                <Typography sx={{ fontWeight: 700, color: '#6E5424' }}>תזכורת לטרם אישרו - <span style={{ fontWeight: "normal" }}>למי שטרם הגיב</span></Typography>
                                <TextField
                                    type="number"
                                    label="כמה ימים מראש"
                                    value={reminderDays}
                                    disabled={reminderLocked || saving}
                                    onChange={(e) => setReminderDays(Math.max(0, Number(e.target.value || 0)))}
                                    size="small"
                                    inputProps={{ min: 0 }}
                                />
                                <Typography variant="body2" sx={{ color: '#5A4A2A' }}>
                                    תאריך שליחה מחושב: {displayReminderDate ? formatScheduleDateTime(displayReminderDate) : '-'}
                                </Typography>
                                {reminderLocked && (
                                    <Alert severity="warning" sx={{ py: 0 }}>
                                        ההודעה כבר נשלחה בתאריך {formatScheduleDateTime(schedule.reminder_locked_at!)} ולא ניתנת עוד לעריכה.
                                    </Alert>
                                )}
                                <Button
                                    size="small"
                                    onClick={() => togglePreview('reminder')}
                                    endIcon={
                                        <ExpandMoreIcon
                                            sx={{
                                                transform: previewOpen.reminder ? 'rotate(180deg)' : 'none',
                                                transition: 'transform 0.2s',
                                            }}
                                        />
                                    }
                                    sx={{ alignSelf: 'flex-start', color: '#1f9f51', fontWeight: 600, fontSize: '0.78rem' }}
                                >
                                    {previewOpen.reminder ? 'הסתרת תצוגה מקדימה' : 'הצגת תצוגה מקדימה'}
                                </Button>
                                <Collapse in={previewOpen.reminder} timeout="auto" unmountOnExit>
                                    <WhatsAppBubblePreview
                                        header="רק תזכורת קטנה... 💛"
                                        body={
                                            `שלום יואב 😊

                                            טרם קיבלנו את אישור הגעתך לחתונה שלנו, וחשוב לנו לדעת אם נזכה לחגוג איתך את היום המיוחד שלנו. 💍✨

                                            📅 מועד האירוע: יום שני, 07 בדצמבר 2026
                                            🥂 קבלת פנים: 19:30
                                            ⛪ חופה: 20:30

                                            נשמח מאוד אם תוכל/י לאשר את הגעתך באמצעות הכפתור למטה, כדי שנוכל להיערך בצורה הטובה ביותר. 🙏

                                            מחכים ומקווים לחגוג איתך! ❤️

                                            באהבה,
                                            שחר & דן 💕`
                                        }
                                        buttonLabel="לאישור הגעה"
                                    />
                                </Collapse>
                            </Stack>

                            <Stack spacing={1.5}>
                                <Typography sx={{ fontWeight: 700, color: '#6E5424' }}>תזכורת בסמוך לאירוע - <span style={{ fontWeight: "normal" }}>לכולם</span></Typography>
                                <TextField
                                    type="number"
                                    label="כמה ימים מראש"
                                    value={dayBeforeDays}
                                    disabled={dayBeforeLocked || saving}
                                    onChange={(e) => setDayBeforeDays(Math.max(0, Number(e.target.value || 0)))}
                                    size="small"
                                    inputProps={{ min: 0 }}
                                />
                                <Typography variant="body2" sx={{ color: '#5A4A2A' }}>
                                    תאריך שליחה מחושב: {displayDayBeforeDate ? formatScheduleDateTime(displayDayBeforeDate) : '-'}
                                </Typography>
                                {dayBeforeLocked && (
                                    <Alert severity="warning" sx={{ py: 0 }}>
                                        ההודעה כבר נשלחה בתאריך {formatScheduleDateTime(schedule.day_before_locked_at!)} ולא ניתנת עוד לעריכה.
                                    </Alert>
                                )}
                                <Button
                                    size="small"
                                    onClick={() => togglePreview('dayBefore')}
                                    endIcon={
                                        <ExpandMoreIcon
                                            sx={{
                                                transform: previewOpen.dayBefore ? 'rotate(180deg)' : 'none',
                                                transition: 'transform 0.2s',
                                            }}
                                        />
                                    }
                                    sx={{ alignSelf: 'flex-start', color: '#1f9f51', fontWeight: 600, fontSize: '0.78rem' }}
                                >
                                    {previewOpen.dayBefore ? 'הסתרת תצוגה מקדימה' : 'הצגת תצוגה מקדימה'}
                                </Button>
                                <Collapse in={previewOpen.dayBefore} timeout="auto" unmountOnExit>
                                    <WhatsAppBubblePreview
                                        header="💍✨ מחר אנחנו מתחתנים ✨💍"
                                        body={
                                            `שלום יואב ❤️

                                            ההתרגשות בשיאה... נשאר רק יום אחד עד שנחגוג יחד את היום המאושר בחיינו! 🥂

                                            📍 מיקום: הגן הכחול, תל אביב
                                            🥂 קבלת פנים: 19:30
                                            ⛪ חופה: 20:30

                                            דרך ההזמנה הדיגיטלית שלנו מחכים לך כל הפרטים שתצטרך/י:
                                            📍 ניווט ישירות ל-Waze
                                            🪑 מיקום הישיבה שלך
                                            📸 גלריה משותפת להעלאת תמונות מהאירוע
                                            ℹ️ מידע נוסף על הערב

                                            💛 מומלץ להגיע מספר דקות לפני קבלת הפנים, ליהנות מהאווירה, מהמנות הפותחות ולהתחיל את החגיגות איתנו.

                                            כבר לא יכולים לחכות לראות אותך ולחגוג יחד! 🥳

                                            נתראה מחר! ❤️

                                            באהבה,
                                            שחר & דן 💕`
                                        }
                                        buttonLabel="צפייה בפרטי האירוע"
                                    />
                                </Collapse>
                            </Stack>

                            <Typography sx={{ fontWeight: 700, mb: 1 }}>ביום שאחרי (נוודא שלא נופל על שבת) תישלח גם הודעת תודה לכל מי שבא :)</Typography>

                            <Box sx={{ p: 1.5, borderRadius: 2, border: '1px dashed rgba(201,168,76,0.55)', background: 'rgba(201,168,76,0.06)' }}>
                                <Typography sx={{ fontWeight: 700, mb: 1 }}>תמונת הזמנה</Typography>
                                {imagePreviewUrl ? (
                                    <Box sx={{ mb: 1.2 }}>
                                        <Box
                                            component="img"
                                            src={imagePreviewUrl}
                                            alt="תצוגה מקדימה"
                                            sx={{ width: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 1.5, border: '1px solid rgba(0,0,0,0.08)', bgcolor: '#fff' }}
                                        />
                                    </Box>
                                ) : (
                                    <Typography variant="body2" sx={{ color: '#7A6A4A', mb: 1 }}>
                                        טרם הועלתה תמונת הזמנה.
                                    </Typography>
                                )}

                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                    <Button
                                        variant="outlined"
                                        startIcon={<UploadFileIcon />}
                                        disabled={invitationLocked || saving}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {imagePreviewUrl ? 'החלפת תמונה' : 'העלאת תמונה'}
                                    </Button>
                                    <Button
                                        variant="text"
                                        color="error"
                                        startIcon={<DeleteOutlineIcon />}
                                        disabled={invitationLocked || saving || !imagePreviewUrl}
                                        onClick={handleDeleteImage}
                                    >
                                        מחיקת תמונה
                                    </Button>
                                </Stack>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    hidden
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        handleUploadImage(file);
                                        e.currentTarget.value = '';
                                    }}
                                />
                            </Box>
                        </>
                    )}
                </Stack>

            </DialogContent>
            <DialogActions sx={{ px: 3, py: 3, justifyContent: 'end' }}>
                <Button onClick={onClose} sx={{ color: '#A08070' }}>סגירה</Button>
                <Button
                    variant="contained"
                    startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
                    disabled={loading || saving || !schedule}
                    onClick={handleSave}
                    sx={{
                        background: 'linear-gradient(135deg, #E0C97A, #C9A84C)',
                        color: '#2C1810',
                        fontWeight: 700,
                    }}
                >
                    שמירה
                </Button>
            </DialogActions>
            <LoadingOverlay
                open={saving}
                message={loadingMessage ?? 'שומר נתונים...'}
                result={result}
                resultMessage={resultMessage}
                onResultShown={() => {
                    setResult(null);
                    setResultMessage('');
                }}
            />
        </Dialog>
    );
}

function WhatsAppBubblePreview({ header, body, buttonLabel, image }: { header: string; body: string; buttonLabel?: string, image?: string; }) {
    return (
        <Box
            sx={{
                mt: 1,
                p: 1.5,
                borderRadius: 2.5,
                background: 'linear-gradient(160deg, #E5DDD5, #EDE5DA)',
                border: '1px solid rgba(0,0,0,0.06)',
            }}
        >
            <Box
                sx={{
                    maxWidth: 320,
                    mx: 'auto',
                    background: '#fff',
                    borderRadius: '10px',
                    borderTopRightRadius: 0,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                    overflow: 'hidden',
                    position: 'relative',
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        right: -8,
                        width: 0,
                        height: 0,
                        borderStyle: 'solid',
                        borderWidth: '0 0 10px 10px',
                        borderColor: 'transparent transparent transparent #fff',
                    },
                }}
            >
                <Box sx={{ p: 1.5, pb: 1 }}>
                    {image ? (
                        <Box
                            component="img"
                            src={image}
                            alt="Invitation"
                            sx={{
                                width: '100%',
                                maxHeight: 380,
                                objectFit: 'cover',
                                display: 'block',
                                borderRadius: 1.5,
                                mb: 1.2,
                                border: '1px solid rgba(0,0,0,0.08)',
                            }}
                        />
                    ) : (
                        <Box
                            sx={{
                                mb: 1.2,
                                height: 180,
                                borderRadius: 1.5,
                                border: '1px dashed rgba(0,0,0,.18)',
                                bgcolor: '#F7F7F7',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                color: '#777',
                            }}
                        >
                            <UploadFileIcon sx={{ fontSize: 42, mb: 1, opacity: .7 }} />
                            <Typography fontSize="0.8rem" fontWeight={600}>
                                תמונת ההזמנה
                            </Typography>
                            <Typography variant="caption">
                                תוצג כאן לאחר העלאה
                            </Typography>
                        </Box>
                    )}
                    <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: '#111B21', mb: 0.75 }}>
                        {header}
                    </Typography>
                    <Typography sx={{ whiteSpace: 'pre-line', fontSize: '0.83rem', color: '#111B21', lineHeight: 1.5 }}>
                        {body}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                        <Typography variant="caption" sx={{ color: '#667781', fontSize: '0.66rem', display: 'flex', alignItems: 'center', gap: 0.3 }}>
                            12:00
                            <CheckCircleIcon sx={{ fontSize: 12, color: '#53BDEB' }} />
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#667781', fontSize: '0.66rem' }}>
                            WedFlow
                        </Typography>
                    </Box>
                </Box>

                {buttonLabel && (
                    <Box
                        sx={{
                            borderTop: '1px solid rgba(0,0,0,0.08)',
                            textAlign: 'center',
                            py: 1,
                            color: '#00A5F4',
                            fontWeight: 600,
                            fontSize: '0.83rem',
                        }}
                    >
                        {buttonLabel}
                    </Box>
                )}
            </Box>

            <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: '#5a5959', mt: 1 }}>
                * לתצוגה בלבד - הנתונים יוחלפו אוטומטית בפועל
            </Typography>
        </Box>
    );
}