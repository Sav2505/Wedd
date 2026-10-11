import { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Snackbar, TextField, Tooltip, Typography } from '@mui/material';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useAppSelector } from '../store';
import { getMyBlessing, saveMyBlessing } from '../services/guests.service';
import BlessingLetter from './BlessingLetter';

export default function GuestBlessing({ recipient, demo = false }: { recipient: string; demo?: boolean }) {
    const guest = useAppSelector((state) => state.auth.guest);
    const [saved, setSaved] = useState('');
    const [draft, setDraft] = useState('');
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(!demo);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [saveError, setSaveError] = useState('');
    const [success, setSuccess] = useState(false);
    const [reload, setReload] = useState(0);
    const sender = demo ? 'האורח שלכם' : guest?.full_name ?? '';

    useEffect(() => {
        if (demo || guest?.role !== 'guest') return;
        let cancelled = false;
        getMyBlessing().then((data) => {
            if (cancelled) return;
            setSaved(data.blessing ?? '');
            setDraft(data.blessing ?? '');
            setLoadError('');
        }).catch((error: Error) => {
            if (!cancelled) setLoadError(error.message);
        }).finally(() => {
            if (!cancelled) setLoading(false);
        });
        return () => { cancelled = true; };
    }, [demo, guest?.id, guest?.role, reload]);

    async function handleSend() {
        if (saving || !draft.trim() || draft.length > 2000) return;
        setSaving(true);
        setSaveError('');
        try {
            const content = demo ? draft.trim() : (await saveMyBlessing(draft)).blessing ?? '';
            setSaved(content);
            setDraft(content);
            setOpen(false);
            setSuccess(true);
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'לא הצלחנו לשלוח את הברכה. נסו שוב.');
        } finally {
            setSaving(false);
        }
    }

    if (!demo && guest?.role !== 'guest') return null;

    return (
        <Box component="section" sx={{ py: 3, px: 1, mb: 2, textAlign: 'center', borderBlock: '1px solid rgba(201,168,76,0.22)' }}>
            <FavoriteBorderOutlinedIcon sx={{ color: '#9A7833', fontSize: 28, mb: 1 }} />
            <Typography component="h2" sx={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: '1.5rem', color: '#2C1810', mb: 0.75 }}>
                כמה מילים מהלב
            </Typography>
            <Typography sx={{ color: '#806D61', fontSize: '0.9rem', mb: 2 }}>
                ברכה אישית לחתן ולכלה, מזכרת לדרך המשותפת
            </Typography>
            {loadError ? <Alert severity="error" sx={{ textAlign: 'start' }} action={
                <Button color="inherit" onClick={() => { setLoading(true); setLoadError(''); setReload((value) => value + 1); }}>נסו שוב</Button>
            }>{loadError}</Alert> : <Button
                variant="outlined" disabled={loading} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <EditOutlinedIcon />}
                onClick={() => { setSaveError(''); setOpen(true); }}
                sx={{ borderRadius: 1, borderColor: '#C9A84C', color: '#9A7833', px: 3, py: 1, fontWeight: 600 }}
            >{saved ? 'עריכת הברכה שלי' : 'השארת ברכה לחתן ולכלה'}</Button>}
            {saved && <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75, mt: 1.5, color: '#527460' }}>
                <CheckCircleOutlineIcon fontSize="small" />
                <Typography variant="caption">{demo ? 'הברכה נשמרה להדגמה בלבד' : 'הברכה שלכם נשלחה באהבה'}</Typography>
            </Box>}

            <Dialog open={open} onClose={() => { if (!saving) setOpen(false); }} fullWidth maxWidth="sm" dir="rtl"
                aria-labelledby="blessing-dialog-title" PaperProps={{ dir: 'rtl', sx: { borderRadius: 2, direction: 'rtl', textAlign: 'start', bgcolor: '#FCFAF7', m: { xs: 1.5, sm: 4 }, width: '100%' } }}>
                <DialogTitle id="blessing-dialog-title" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, fontFamily: "'Frank Ruhl Libre', serif", color: '#73552B', fontSize: '1.5rem', direction: "ltr" }}>
                    ברכה לחתן והכלה
                    <Tooltip title="סגירה"><span><IconButton disabled={saving} aria-label="סגירה" onClick={() => setOpen(false)}><CloseOutlinedIcon /></IconButton></span></Tooltip>
                </DialogTitle>
                <DialogContent dir="rtl" sx={{ px: { xs: 2, sm: 3 } }}>
                    {demo && <Alert severity="info" sx={{ mb: 2 }}>זוהי הדגמה בלבד. הברכה לא תישלח לזוג.</Alert>}
                    <TextField autoFocus fullWidth multiline minRows={4} maxRows={8} label="ההקדשה שלכם" value={draft} disabled={saving}
                        onChange={(event) => { setDraft(event.target.value); setSaveError(''); }}
                        placeholder="ההקדשה שלכם..."
                        slotProps={{ htmlInput: { maxLength: 2000, dir: 'rtl', style: { textAlign: 'start' } } }} sx={{ mt: 1 }} />
                    <Typography sx={{ textAlign: 'end', color: '#806D61', mt: 0.75, fontSize: '0.75rem' }}>{draft.length.toLocaleString('he-IL')} / 2,000</Typography>
                    <Typography sx={{ color: '#9A7833', fontSize: '0.8rem', mb: 1, mt: 2 }}>תצוגה מקדימה</Typography>
                    <BlessingLetter content={draft} sender={sender} recipient={recipient} />
                    {saveError && <Alert severity="error" role="alert" sx={{ mt: 2 }}>{saveError}</Alert>}
                </DialogContent>
                <DialogActions sx={{ px: { xs: 2, sm: 3 }, pb: 2.5, pt: 1.5, gap: 1, flexWrap: 'wrap' }}>
                    <Button disabled={saving} onClick={() => setOpen(false)} sx={{ color: '#806D61' }}>סגירה</Button>
                    <Button variant="contained" onClick={handleSend} disabled={saving || !draft.trim() || draft.length > 2000 || draft.trim() === saved}
                        dir="rtl" endIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SendOutlinedIcon sx={{ rotate: '180deg' }} />}
                        sx={{ bgcolor: '#9A7833', color: '#fff', borderRadius: 1, px: 2.5, '&:hover': { bgcolor: '#826326' } }}>
                        {saving ? 'שולחים...' : saved ? 'עדכון הברכה' : 'שליחת הברכה'}
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar open={success} autoHideDuration={5000} onClose={() => setSuccess(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert severity="success" onClose={() => setSuccess(false)}>{demo ? 'הברכה נשמרה להדגמה בלבד' : 'הברכה נשלחה לחתן ולכלה. תודה על המילים החמות!'}</Alert>
            </Snackbar>
        </Box>
    );
}