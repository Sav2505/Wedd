import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';

export interface WeddingInfoEditorHandle {
  isDirty: boolean;
  save: () => Promise<boolean>;
}
import {
  Box, Typography, TextField, Button, CircularProgress,
  Alert, InputAdornment, Divider, Dialog, DialogTitle,
  DialogContent, DialogActions,
} from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import CheckroomOutlinedIcon from '@mui/icons-material/CheckroomOutlined';
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import * as L from 'leaflet';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { heIL } from '@mui/x-date-pickers/locales';
import dayjs from 'dayjs';
import 'dayjs/locale/he';
import { updateWeddingInfo, WeddingInfoUpdate } from '../../services/info.service';
import { useWeddingInfo } from '../../hooks/useWeddingInfo';
import { useWeddingId } from '../../hooks/useWeddingId';
import LoadingOverlay from '../../components/LoadingOverlay';

dayjs.locale('he');

// ─── Gold pin icon (lazy so DOM is ready) ──────────────────────────

let _goldMarker: L.DivIcon | null = null;
function getGoldMarker(): L.DivIcon {
  if (!_goldMarker) {
    _goldMarker = L.divIcon({
      html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36"><path fill="#C9A84C" stroke="white" stroke-width="0.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    });
  }
  return _goldMarker;
}

// ─── Click handler (inner map component) ─────────────────────

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

// ─── Section header ──────────────────────────────────────────

function SectionTitle({ children }: { children: string }) {
  return (
    <Typography
      sx={{
        fontFamily: "'Frank Ruhl Libre', serif",
        fontSize: '1rem',
        fontWeight: 700,
        color: '#9A7833',
        mt: 3,
        mb: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        '&::after': {
          content: '""',
          flex: 1,
          height: '1px',
          background: 'linear-gradient(to left, transparent, rgba(201,168,76,0.25))',
        },
      }}
    >
      {children}
    </Typography>
  );
}

// ─── Styled input ────────────────────────────────────────────
const fieldBgColor = 'rgba(255,255,255,0.7)';
const fieldHoverBorderColor = '#C9A84C';
const fieldFocusBorderColor = '#9A7833';
const fieldFocusLabelColor = '#9A7833';
const fieldBorderRadius = 0.75;

const fieldSx = {
  mb: 2,
  '& .MuiOutlinedInput-root': {
    borderRadius: fieldBorderRadius,
    background: `${fieldBgColor} !important`,
    '&:hover fieldset': {
      borderColor: fieldHoverBorderColor,
    },
    '&.Mui-focused fieldset': {
      borderColor: fieldFocusBorderColor,
    },
  },
  '& label.Mui-focused': {
    color: fieldFocusLabelColor,
  },
};

export const datePickerSx = {
  ...fieldSx,
  '& .MuiPickersInputBase-root': {
    backgroundColor: `${fieldBgColor} !important`,
    borderRadius: `12px !important`,
    '&:hover fieldset': {
      borderColor: fieldHoverBorderColor,
    },

    '&.Mui-focused fieldset': {
      borderColor: fieldFocusBorderColor,
    },
  },

  '& label.Mui-focused': {
    color: fieldFocusLabelColor,
  },
}

// ─── Main ────────────────────────────────────────────────────

const WeddingInfoEditor = forwardRef<WeddingInfoEditorHandle>(function WeddingInfoEditor(_, ref) {
  const weddingId = useWeddingId();
  const { info, loading, error: fetchError, refetch } = useWeddingInfo();
  const [saving, setSaving] = useState(false);
  const [result, setResult] =
    useState<'success' | 'error' | null>(null);
  const [resultMessage, setResultMessage] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [isBitHelpOpen, setIsBitHelpOpen] = useState(false);

  // local form state
  const [form, setForm] = useState<WeddingInfoUpdate>({});

  useEffect(() => {
    if (!info) return;
    setForm({
      bride_name: info.bride_name,
      groom_name: info.groom_name,
      wedding_date: info.wedding_date?.slice(0, 10) ?? '',
      wedding_time: info.wedding_time?.slice(0, 5) ?? '',
      wedding_canpoy_time: info.wedding_canpoy_time?.slice(0, 5) ?? '',
      venue_name: info.venue_name,
      venue_address: info.venue_address,
      venue_lat: info.venue_lat != null ? Number(info.venue_lat) : null,
      venue_lng: info.venue_lng != null ? Number(info.venue_lng) : null,
      dress_code: info.dress_code ?? '',
      notes: info.notes ?? '',
      bride_bit_url: info.bride_bit_url ?? '',
      groom_bit_url: info.groom_bit_url ?? '',
    });
    setIsDirty(false);
  }, [info]);

  const set = (key: keyof WeddingInfoUpdate) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setIsDirty(true);
  };

  async function handleSave(): Promise<boolean> {
    if (weddingId == null) {
      setResult('error');
      setResultMessage('לא נמצא מזהה חתונה');
      return false;
    }

    setSaving(true);

    try {
      await updateWeddingInfo(form, weddingId);
      refetch();

      setResult('success');
      setResultMessage('פרטי החתונה נשמרו בהצלחה');
      setIsDirty(false);
      return true;
    } catch (err) {
      setResult('error');
      setResultMessage(
        err instanceof Error
          ? err.message
          : 'שגיאה בשמירה'
      );
      return false;
    } finally {
      setSaving(false);
    }
  }

  useImperativeHandle(ref, () => ({ isDirty, save: handleSave }), [isDirty]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: '#C9A84C' }} />
      </Box>
    );
  }

  if (!info && fetchError) {
    return <Alert severity="error" sx={{ m: 2 }}>{fetchError}</Alert>;
  }

  return (
    <LocalizationProvider
      dateAdapter={AdapterDayjs}
      adapterLocale="he"
      localeText={heIL.components.MuiLocalizationProvider.defaultProps.localeText}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <Box sx={{ px: 2, pt: 2, pb: 4, maxWidth: 560, mx: 'auto' }}>
          {/* ── שמות ── */}
          <SectionTitle>שמות בני הזוג</SectionTitle>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="שם הכלה"
              fullWidth
              value={form.bride_name ?? ''}
              onChange={set('bride_name')}
              sx={fieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PeopleOutlineIcon sx={{ color: '#C9A84C', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="שם החתן"
              fullWidth
              value={form.groom_name ?? ''}
              onChange={set('groom_name')}
              sx={fieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PeopleOutlineIcon sx={{ color: '#C9A84C', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {/* ── תאריך ושעה ── */}
          <SectionTitle>מועד האירוע</SectionTitle>
          <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column', mb: 2 }}>
            <DatePicker
              value={form.wedding_date ? dayjs(form.wedding_date) : null}
              onChange={(newValue) => {
                setForm((prev) => ({
                  ...prev,
                  wedding_date: newValue && newValue.isValid() ? newValue.format('YYYY-MM-DD') : '',
                }));
                setIsDirty(true);
              }}
              format="DD/MM/YYYY"
              slots={{
                openPickerIcon: CalendarMonthIcon,
              }}
              slotProps={{
                textField: {
                  label: 'תאריך',
                  fullWidth: true,
                  sx: datePickerSx
                },
                openPickerButton: {
                  sx: {
                    color: '#C9A84C',
                    '& svg': {
                      fontSize: `20px !important`,
                    },
                  },
                },
              }}
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="קבלת פנים"
                type="time"
                fullWidth
                value={form.wedding_time ?? ''}
                onChange={set('wedding_time')}
                sx={fieldSx}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccessTimeIcon sx={{ color: '#C9A84C', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="חופה"
                type="time"
                fullWidth
                value={form.wedding_canpoy_time ?? ''}
                onChange={set('wedding_canpoy_time')}
                sx={fieldSx}
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccessTimeIcon sx={{ color: '#C9A84C', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          </Box>

          {/* ── מיקום ── */}
          <SectionTitle>מיקום</SectionTitle>
          <TextField
            label="שם האולם / המקום"
            fullWidth
            value={form.venue_name ?? ''}
            onChange={set('venue_name')}
            sx={fieldSx}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LocationOnOutlinedIcon sx={{ color: '#C9A84C', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="כתובת מלאה"
            fullWidth
            value={form.venue_address ?? ''}
            onChange={set('venue_address')}
            sx={fieldSx}
          />

          {/* ── מפה לבחירת מיקום ── */}
          <Typography
            variant="caption"
            sx={{ color: '#A08070', display: 'block', mb: 1 }}
          >
            לחץ על המפה לקביעת מיקום מדויק לניווט (Waze / Google Maps)
          </Typography>
          <Box
            sx={{
              height: 250,
              borderRadius: 1,
              overflow: 'hidden',
              border: '1.5px solid rgba(201,168,76,0.35)',
              mb: 1,
            }}
          >
            <MapContainer
              center={[
                form.venue_lat ?? 31.7683,
                form.venue_lng ?? 35.2137,
              ]}
              zoom={form.venue_lat ? 15 : 7}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <ClickHandler
                onPick={(lat, lng) => {
                  setForm((prev) => ({ ...prev, venue_lat: lat, venue_lng: lng }));
                  setIsDirty(true);
                }}
              />
              {form.venue_lat != null && form.venue_lng != null && (
                <Marker
                  position={[form.venue_lat, form.venue_lng]}
                  icon={getGoldMarker()}
                  draggable
                  eventHandlers={{
                    dragend(e) {
                      const { lat, lng } = (e.target as L.Marker).getLatLng();
                      setForm((prev) => ({ ...prev, venue_lat: lat, venue_lng: lng }));
                      setIsDirty(true);
                    },
                  }}
                />
              )}
            </MapContainer>
          </Box>
          {form.venue_lat != null && form.venue_lng != null ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography variant="caption" sx={{ color: '#A08070', flex: 1 }}>
                📍 {Number(form.venue_lat).toFixed(5)}, {Number(form.venue_lng).toFixed(5)}
              </Typography>
              <Button
                size="small"
                onClick={() => {
                  setForm((prev) => ({ ...prev, venue_lat: null, venue_lng: null }));
                  setIsDirty(true);
                }}
                sx={{
                  color: '#9A7833',
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  minWidth: 'auto',
                  p: '2px 8px',
                }}
              >
                נקה פין
              </Button>
            </Box>
          ) : (
            <Box sx={{ mb: 2 }} />
          )}

          {/* ── תשלום BIT ── */}
          <SectionTitle>תשלום (לא חובה)</SectionTitle>
          <Box
            sx={{
              mb: 2,
              p: 1.5,
              borderRadius: 1,
              border: '1px solid rgba(201,168,76,0.25)',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(250,247,242,0.92) 100%)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ color: '#9A7833', fontWeight: 700, fontSize: '0.95rem' }}>
                קישורי תשלום ב-BIT
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setIsBitHelpOpen(true)}
                startIcon={<HelpOutlineIcon sx={{ fontSize: 18 }} />}
                sx={{
                  borderColor: 'rgba(201,168,76,0.45)',
                  color: '#9A7833',
                  pt: 0.8,
                  pb: 0.8,
                  pr: 2.5,
                  pl: 2.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: "15px",
                  '&:hover': {
                    borderColor: '#C9A84C',
                    backgroundColor: 'rgba(201,168,76,0.08)',
                  },
                }}
              >
                איך להוציא קישור ?
              </Button>
            </Box>

            <Typography variant="caption" sx={{ color: '#A08070', display: 'block', mb: 1.5 }}>
              ניתן להדביק כאן קישורי BIT אישיים של החתן והכלה. הקישורים יוצגו לאורחים.
            </Typography>

            <TextField
              label="קישור BIT לכלה"
              fullWidth
              type="url"
              value={form.bride_bit_url ?? ''}
              onChange={set('bride_bit_url')}
              placeholder="https://www.bit...."
              sx={fieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <QrCode2OutlinedIcon sx={{ color: '#C9A84C', fontSize: 20 }} />
                  </InputAdornment>
                ),
                inputProps: {
                  dir: 'ltr',
                },
              }}
            />
            <TextField
              label="קישור BIT לחתן"
              fullWidth
              type="url"
              value={form.groom_bit_url ?? ''}
              onChange={set('groom_bit_url')}
              placeholder="https://www.bit...."
              sx={fieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <QrCode2OutlinedIcon sx={{ color: '#C9A84C', fontSize: 20 }} />
                  </InputAdornment>
                ),
                inputProps: {
                  dir: 'ltr',
                },
              }}
            />
          </Box>

          {/* ── קוד לבוש ── */}
          <SectionTitle>פרטים נוספים (לא חובה)</SectionTitle>
          <TextField
            label="קוד לבוש"
            fullWidth
            value={form.dress_code ?? ''}
            onChange={set('dress_code')}
            placeholder="לדוגמה: לבוש חגיגי — גוונים בהירים"
            sx={fieldSx}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <CheckroomOutlinedIcon sx={{ color: '#C9A84C', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="הערות לאורחים"
            fullWidth
            multiline
            rows={3}
            value={form.notes ?? ''}
            onChange={set('notes')}
            placeholder="לדוגמה: אנא הגיעו 30 דקות לפני..."
            sx={fieldSx}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ mt: '14px', alignSelf: 'flex-start' }}>
                  <NotesOutlinedIcon sx={{ color: '#C9A84C', fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />

          <Divider sx={{ my: 3, borderColor: 'rgba(201,168,76,0.2)' }} />

          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveOutlinedIcon />}
            sx={{
              background: 'linear-gradient(135deg, #C9A84C, #9A7833)',
              color: '#FAF7F2',
              fontWeight: 700,
              fontSize: '1rem',
              borderRadius: 50,
              py: 1.5,
              boxShadow: '0 4px 20px rgba(201,168,76,0.4)',
              '&:hover': { background: 'linear-gradient(135deg, #E0C97A, #C9A84C)' },
            }}
          >
            {saving ? 'שומר…' : 'שמור פרטים'}
          </Button>
          <LoadingOverlay
            open={saving}
            message="שומר את פרטי החתונה..."
            result={result}
            resultMessage={resultMessage}
            onResultShown={() => {
              setResult(null);
              setResultMessage('');
            }}
          />

          <Dialog
            open={isBitHelpOpen}
            onClose={() => setIsBitHelpOpen(false)}
            fullWidth
            maxWidth="sm"
          >
            <DialogTitle sx={{ color: '#9A7833', fontWeight: 700 }}>
              איך מוציאים קישור תשלום של BIT?
            </DialogTitle>
            <DialogContent dividers>
              <Typography sx={{ color: '#6F5547', mb: 1.5 }}>
                כדי לקבל קישור אישי מתוך קוד ה-QR הקבוע של BIT, בצעו את השלבים הבאים:
              </Typography>
              <Box
                component="ol"
                sx={{
                  m: 0,
                  p: '0 1.2rem 0 0',
                  color: '#6F5547',
                  '& li': { mb: 1.25, lineHeight: 1.7 },
                }}
              >
                <li>היכנסו לאפליקציית BIT ולחצו על כפתור "עוד" (שלוש נקודות) בטאב הראשי.</li>
                <li>בחרו באפשרות "קוד ה-QR הקבוע שלי לקבלת כסף".</li>
                <li>בצעו שיתוף קוד ושמרו את התמונה לגלריה.</li>
                <li>פתחו את הגלריה, היכנסו לתמונת ה-QR, לחצו לחיצה ארוכה על הקוד ובחרו "העתקת קישור".</li>
                <li>הדביקו את הקישור בשדה המתאים לכלה או לחתן.</li>
              </Box>
              <Typography variant="caption" sx={{ color: '#A08070', display: 'block', mt: 1.5 }}>
                טיפ: מומלץ לבדוק שהקישור נפתח לפני שמירה.
              </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 2, py: 1.25 }}>
              <Button
                onClick={() => setIsBitHelpOpen(false)}
                variant="contained"
                sx={{
                  background: 'linear-gradient(135deg, #C9A84C, #9A7833)',
                  color: '#FAF7F2',
                  textTransform: 'none',
                  fontWeight: 700,
                  '&:hover': { background: 'linear-gradient(135deg, #E0C97A, #C9A84C)' },
                }}
              >
                הבנתי
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </motion.div>
    </LocalizationProvider>
  );
});

export default WeddingInfoEditor;