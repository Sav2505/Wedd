import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Fade,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import HeartBrokenIcon from '@mui/icons-material/HeartBroken';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import FavoriteIcon from '@mui/icons-material/Favorite';
import CelebrationIcon from '@mui/icons-material/Celebration';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import { motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../store';
import { setGuest } from '../store/authSlice';
import GoldCard from '../components/GoldCard';
import { getMyRsvp, updateMyRsvp } from '../services/guests.service';
import { RsvpStatus } from '../types/domain';

const RSVP_MAX_GUESTS = Number(import.meta.env.VITE_RSVP_MAX_GUESTS ?? 10);

type Props = {
  onSaved?: (status: RsvpStatus) => void;
};

type SaveOutcome = 'COMING' | 'NOT_COMING' | null;

function StatusCard({
  selected,
  title,
  subtitle,
  icon,
  onClick,
  palette,
}: {
  selected: boolean;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
  palette: {
    bg: string;
    border: string;
    text: string;
    glow: string;
  };
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      whileHover={{ y: -2 }}
      style={{
        border: 'none',
        padding: 0,
        background: 'transparent',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'right',
      }}
    >
      <Box
        sx={{
          borderRadius: 3,
          border: selected ? `2px solid ${palette.border}` : '1px solid rgba(201,168,76,0.25)',
          background: selected ? palette.bg : 'rgba(255,255,255,0.74)',
          boxShadow: selected ? palette.glow : '0 4px 14px rgba(44,24,16,0.08)',
          p: 1.8,
          transition: 'all 0.22s ease',
        }}
      >
        <Stack direction="row" spacing={1.1} alignItems="center">
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              color: selected ? palette.text : '#9A7833',
              background: selected ? 'rgba(255,255,255,0.35)' : 'rgba(201,168,76,0.14)',
            }}
          >
            {icon}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 800, color: selected ? palette.text : '#2C1810', lineHeight: 1.2 }}>
              {title}
            </Typography>
            <Typography variant="caption" sx={{ color: selected ? 'rgba(255,255,255,0.95)' : '#8A7565' }}>
              {subtitle}
            </Typography>
          </Box>
        </Stack>
      </Box>
    </motion.button>
  );
}

export default function AttendanceStatusTab({ onSaved }: Props) {
  const dispatch = useAppDispatch();
  const guest = useAppSelector((s) => s.auth.guest);

  const [status, setStatus] = useState<RsvpStatus>('PENDING');
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saveOutcome, setSaveOutcome] = useState<SaveOutcome>(null);

  useEffect(() => {
    getMyRsvp()
      .then((data) => {
        setStatus(data.rsvp_status);
        setCount(Math.max(1, Math.min(RSVP_MAX_GUESTS, data.number_of_guests || 1)));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'שגיאה בטעינת סטטוס נוכחות'))
      .finally(() => setLoading(false));
  }, []);

  const cardPalettes = useMemo(() => ({
    COMING: {
      bg: 'linear-gradient(145deg, #41A86A, #2E8B57)',
      border: '#2E8B57',
      text: '#FFFFFF',
      glow: '0 10px 26px rgba(46,139,87,0.35)',
    },
    NOT_COMING: {
      bg: 'linear-gradient(145deg, #D46A63, #B9473D)',
      border: '#B9473D',
      text: '#FFFFFF',
      glow: '0 10px 26px rgba(185,71,61,0.30)',
    },
    PENDING: {
      bg: 'linear-gradient(145deg, #C9A84C, #AA8532)',
      border: '#AA8532',
      text: '#FFFFFF',
      glow: '0 10px 26px rgba(169,133,51,0.30)',
    },
  }), []);

  async function handleSave() {
    if (!guest) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await updateMyRsvp({
        rsvp_status: status,
        number_of_guests: count,
      });

      dispatch(setGuest({
        ...guest,
        rsvp_status: updated.rsvp_status,
        number_of_guests: updated.number_of_guests,
        rsvp_updated_at: updated.rsvp_updated_at,
      }));

      if (updated.rsvp_status === 'COMING' || updated.rsvp_status === 'NOT_COMING') {
        setSaveOutcome(updated.rsvp_status);
      } else {
        setSuccess('האישור נשמר בהצלחה');
        onSaved?.(updated.rsvp_status);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'לא הצלחנו לשמור כרגע את האישור');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress sx={{ color: '#C9A84C' }} />
      </Box>
    );
  }

  if (saveOutcome) {
    const isComing = saveOutcome === 'COMING';

    return (
      <Fade in timeout={380}>
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 1600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: 2,
            background: isComing
              ? 'radial-gradient(ellipse at 20% 15%, rgba(65,168,106,0.34), transparent 55%), radial-gradient(ellipse at 80% 85%, rgba(201,168,76,0.30), transparent 58%), linear-gradient(155deg, #F6FFF8 0%, #EDF9F0 45%, #FFF9EE 100%)'
              : 'radial-gradient(ellipse at 22% 18%, rgba(201,168,76,0.26), transparent 56%), radial-gradient(ellipse at 83% 80%, rgba(185,71,61,0.16), transparent 56%), linear-gradient(160deg, #FFFCF6 0%, #FBF4E7 45%, #FFF8F1 100%)',
            overflow: 'hidden',
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ width: '100%', maxWidth: 760, position: 'relative' }}
          >
            <Box
              sx={{
                borderRadius: 4,
                p: { xs: 3, sm: 5 },
                textAlign: 'center',
                border: isComing ? '1px solid rgba(46,139,87,0.32)' : '1px solid rgba(201,168,76,0.34)',
                boxShadow: isComing
                  ? '0 20px 54px rgba(46,139,87,0.22), inset 0 1px 0 rgba(255,255,255,0.8)'
                  : '0 18px 52px rgba(154,120,51,0.18), inset 0 1px 0 rgba(255,255,255,0.8)',
                background: 'linear-gradient(145deg, rgba(255,255,255,0.90) 0%, rgba(255,251,241,0.92) 100%)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                style={{ display: 'inline-flex', marginBottom: 10 }}
              >
                <Box
                  sx={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#fff',
                    background: isComing
                      ? 'linear-gradient(145deg, #41A86A, #2E8B57)'
                      : 'linear-gradient(145deg, #C9A84C, #AA8532)',
                    boxShadow: isComing
                      ? '0 12px 28px rgba(46,139,87,0.38)'
                      : '0 12px 28px rgba(169,133,51,0.34)',
                  }}
                >
                  {isComing ? <CelebrationIcon sx={{ fontSize: 35 }} /> : <SentimentSatisfiedAltIcon sx={{ fontSize: 35 }} />}
                </Box>
              </motion.div>

              <Typography
                sx={{
                  fontFamily: "'Frank Ruhl Libre', serif",
                  fontWeight: 700,
                  fontSize: { xs: '1.9rem', sm: '2.35rem' },
                  color: '#2C1810',
                  lineHeight: 1.2,
                }}
              >
                {isComing ? 'איזו התרגשות, ממש שימחתם אותנו!' : 'תודה שעדכנתם אותנו באהבה'}
              </Typography>

              <Typography
                sx={{
                  mt: 1.2,
                  color: '#8A6A2B',
                  fontSize: { xs: '1.05rem', sm: '1.2rem' },
                  lineHeight: 1.8,
                  whiteSpace: 'pre-line',
                }}
              >
                {isComing
                  ? 'אנחנו כל כך שמחים שתהיו איתנו ברגע הכי מרגש שלנו.\nמחכים לחבק אתכם ולחגוג יחד ערב בלתי נשכח. ❤️'
                  : 'זה לגמרי בסדר, ואנחנו מודים לכם על הכנות והעדכון.\nאם יהיה שינוי בהמשך, נשמח מאוד שתעדכנו אותנו כאן בכל רגע. 🙂'}
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.1} justifyContent="center" sx={{ mt: 2.2 }}>
                {isComing ? (
                  <Button
                    variant="contained"
                    startIcon={<MarkEmailReadIcon />}
                    onClick={() => {
                      setSaveOutcome(null);
                      setSuccess('שמחנו לקבל את אישור ההגעה שלכם ❤️');
                      onSaved?.('COMING');
                    }}
                    sx={{
                      borderRadius: 999,
                      px: 3,
                      py: 1,
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #41A86A, #2E8B57)',
                      '&:hover': { background: 'linear-gradient(135deg, #4CB777, #359E63)' },
                    }}
                  >
                    איזה כיף, תודה!
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    startIcon={<FavoriteIcon />}
                    onClick={() => {
                      setSaveOutcome(null);
                      setSuccess('תודה על העדכון. אם משהו ישתנה, נשמח לעדכון נוסף כאן.');
                    }}
                    sx={{
                      borderRadius: 999,
                      px: 3,
                      py: 1,
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #E0C97A, #C9A84C)',
                      color: '#2C1810',
                      '&:hover': { background: 'linear-gradient(135deg, #E8D490, #D5AD57)' },
                    }}
                  >
                    הבנתי, תודה
                  </Button>
                )}
              </Stack>
            </Box>
          </motion.div>
        </Box>
      </Fade>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <GoldCard sx={{ mb: 2.2 }}>
          <Typography
            variant="h5"
            sx={{
              textAlign: 'center',
              fontFamily: "'Frank Ruhl Libre', serif",
              fontWeight: 700,
              color: '#2C1810',
              mb: 0.6,
            }}
          >
            האם תגיעו לחתונה שלנו?
          </Typography>
          <Typography sx={{ textAlign: 'center', color: '#9A7833', mb: 2.2 }}>
            נשמח לדעת כדי שנוכל להיערך בצורה מושלמת
          </Typography>

          <Stack spacing={1.2}>
            <StatusCard
              selected={status === 'COMING'}
              title="מגיעים ❤️"
              subtitle="איזה כיף, מחכים לכם"
              icon={<DoneAllIcon sx={{ fontSize: 19 }} />}
              onClick={() => setStatus('COMING')}
              palette={cardPalettes.COMING}
            />
            <StatusCard
              selected={status === 'NOT_COMING'}
              title="לא מגיעים 😔"
              subtitle="נתגעגע ונשמח לחגוג איתכם בהמשך"
              icon={<HeartBrokenIcon sx={{ fontSize: 19 }} />}
              onClick={() => setStatus('NOT_COMING')}
              palette={cardPalettes.NOT_COMING}
            />
            <StatusCard
              selected={status === 'PENDING'}
              title="עדיין מתלבטים"
              subtitle="אפשר לשמור גם החלטה זמנית"
              icon={<HourglassTopIcon sx={{ fontSize: 19 }} />}
              onClick={() => setStatus('PENDING')}
              palette={cardPalettes.PENDING}
            />
          </Stack>
        </GoldCard>

        {status === 'COMING' && (
          <GoldCard delay={0.08} sx={{ mb: 2.2 }}>
            <Typography sx={{ color: '#2C1810', fontWeight: 700, mb: 1.1 }}>
              כמה אנשים יגיעו?
            </Typography>

            <Box
              sx={{
                borderRadius: 2.5,
                border: '1px solid rgba(201,168,76,0.28)',
                background: 'linear-gradient(145deg, rgba(250,247,242,0.9), rgba(245,237,217,0.9))',
                p: 1.1,
                display: 'flex',
                alignItems: 'center',
                gap: 1.1,
              }}
            >
              <PeopleAltIcon sx={{ color: '#9A7833', fontSize: 20 }} />
              <Typography sx={{ flex: 1, color: '#6B5240', fontWeight: 600 }}>
                {count === 1 ? 'אגיע לבד' : `אגיע עם ${count === 2 ? "עוד אורח/ת אחד/ת" : `${count - 1} אורחים נוספים`}`}
              </Typography>

              <IconButton
                size="small"
                disabled={count <= 1}
                onClick={() => setCount((v) => Math.max(1, v - 1))}
              >
                <RemoveCircleOutlineIcon sx={{ color: count <= 1 ? '#C8B89A' : '#C9A84C' }} />
              </IconButton>

              <Typography sx={{ minWidth: 22, textAlign: 'center', fontWeight: 800, color: '#2C1810' }}>
                {count}
              </Typography>

              <IconButton
                size="small"
                disabled={count >= RSVP_MAX_GUESTS}
                onClick={() => setCount((v) => Math.min(RSVP_MAX_GUESTS, v + 1))}
              >
                <AddCircleOutlineIcon sx={{ color: count >= RSVP_MAX_GUESTS ? '#C8B89A' : '#C9A84C' }} />
              </IconButton>
            </Box>
            <Typography variant="caption" sx={{ mt: 0.9, display: 'block', color: '#8A7565' }}>
              מינימום 1, מקסימום {RSVP_MAX_GUESTS}
            </Typography>
          </GoldCard>
        )}

        {error && <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 1.5, borderRadius: 2 }}>{success}</Alert>}

        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            onClick={handleSave}
            disabled={saving}
            variant="contained"
            startIcon={<FavoriteIcon />}
            sx={{
              px: 3.5,
              py: 1.1,
              borderRadius: 999,
              fontWeight: 800,
              background: 'linear-gradient(135deg, #E0C97A, #C9A84C)',
              color: '#2C1810',
              boxShadow: '0 8px 22px rgba(201,168,76,0.35)',
              '&:hover': { background: 'linear-gradient(135deg, #E8D490, #D5AD57)' },
            }}
          >
            {saving ? 'שומרים...' : 'שמירת אישור הגעה'}
          </Button>
        </Box>
      </motion.div>
    </Box>
  );
}
