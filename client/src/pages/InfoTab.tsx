import {
  Alert, Box, ButtonBase, IconButton, Snackbar, Typography, Skeleton, Divider, Dialog, DialogTitle, DialogContent, DialogActions, Button,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CheckroomIcon from '@mui/icons-material/Checkroom';
import NoteIcon from '@mui/icons-material/Note';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { motion } from 'framer-motion';
import { WeddingInfo } from '../types/domain';
import { foodBlessing } from '../data/data';
import GoldCard from '../components/GoldCard';
import MapButtons from '../components/MapButtons';
import GuestBlessing from '../components/GuestBlessing';
import CountdownTimer from '../components/CountdownTimer';
import WeddingRegisterCTA from '../components/WeddingRegisterCTA';
import RideCoordinationModal from '../components/RideCoordinationModal';
import { useWeddingInfo } from '../hooks/useWeddingInfo';
import { downloadWeddingCalendar } from '../services/info.service';
import { palette } from '../shared/animations';
import { useState } from 'react';
import { toSafeExternalUrl } from '../utils/externalUrl';

// ─── helpers ────────────────────────────────────────────────

function formatHebrewDate(iso: string): string {
  // Use noon to avoid UTC→local timezone shift flipping the day
  const d = new Date(iso + 'T12:00:00');
  const weekday = d.toLocaleDateString('he-IL', { weekday: 'long' });
  const date = d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
  return `${weekday}, ${date}`;
}

// ─── Info row ───────────────────────────────────────────────

function InfoRow({
  icon, label, value, delay = 0, compact = false,
}: {
  icon: React.ReactNode; label: string; value: string; delay?: number; compact?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: compact ? 1.5 : 2,
          py: compact ? 1.45 : 2,
        }}
      >
        <Box
          sx={{
            width: compact ? 40 : 44,
            height: compact ? 40 : 44,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(224,201,122,0.25), rgba(201,168,76,0.15))',
            border: '1px solid rgba(201,168,76,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: '#C9A84C',
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{ color: '#A08070', display: 'block', mb: 0.25, fontWeight: 500, fontSize: compact ? '0.62rem' : undefined }}
          >
            {label}
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: '#2C1810', fontWeight: 500, lineHeight: 1.5, fontSize: compact ? '0.875rem' : undefined }}
          >
            {value}
          </Typography>
        </Box>
      </Box>
    </motion.div>
  );
}

function GiftButtons({
  provider = 'Bit',
  brideUrl = null,
  groomUrl = null,
  groupUrl = null,
  isDemo,
  onDemoClick,
}: {
  provider?: 'Bit' | 'PayBox';
  brideUrl?: string | null;
  groomUrl?: string | null;
  groupUrl?: string | null;
  isDemo: boolean;
  onDemoClick: () => void;
}) {
  const isPayBox = provider === 'PayBox';
  const firstUrl = isPayBox ? groupUrl : brideUrl;
  if (!firstUrl && (isPayBox || !groomUrl)) return null;
  const accent = isPayBox ? '#0070BA' : '#9A7833';
  const border = isPayBox ? 'rgba(0,112,186,0.35)' : 'rgba(201,168,76,0.55)';
  const hoverBackground = isPayBox ? 'rgba(0,112,186,0.06)' : 'rgba(201,168,76,0.08)';

  return (
    <GoldCard
      delay={isPayBox ? 0.27 : 0.25}
      sx={{ mb: 2, ...(isPayBox ? { background: '#FFFFFF', border: '1px solid rgba(0,112,186,0.2)' } : {}) }}
    >
      <Box
        component="section"
        aria-label={`מתנות ב-${provider}`}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
          {isPayBox ? (
            <Box component="img" src="/paybox-logo.png" alt="PayBox" sx={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 1, flexShrink: 0 }} />
          ) : (
            <Box
              component="img"
              src="/bit-logo.png"
              alt="BIT"
              sx={{ width: 20, height: 20, objectFit: 'contain', borderRadius: '4px' }}
            />
          )}
          <Typography sx={{ color: palette.textMuted, fontWeight: 700, fontSize: '0.95rem' }}>
            מתנה לחתן/כלה
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: '#A08070', display: 'block', mb: 1.5 }}>
          {isPayBox ? 'ניתן לשלוח מתנה ב-PayBox באמצעות לחיצה על הקישור' : 'ניתן לשלוח מתנה ב-Bit באמצעות לחיצה על הקישור'}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1.1, flexDirection: 'column' }}>
          {firstUrl && (
            <Box
              component={isDemo ? 'button' : 'a'}
              type={isDemo ? 'button' : undefined}
              href={isDemo ? undefined : firstUrl}
              target={isDemo ? undefined : '_blank'}
              rel={isDemo ? undefined : 'noopener noreferrer'}
              onClick={isDemo ? onDemoClick : undefined}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                py: 1.15,
                px: 1.5,
                borderRadius: isPayBox ? 1 : 50,
                border: `1.5px solid ${border}`,
                color: accent,
                fontFamily: "'Heebo', sans-serif",
                fontWeight: 700,
                fontSize: '0.88rem',
                textDecoration: 'none',
                background: 'rgba(255,255,255,0.75)',
                transition: 'all 0.22s ease',
                cursor: 'pointer',
                width: '100%',
                outline: 'none',
                '&:hover': { transform: 'translateY(-2px)', background: hoverBackground },
                '&:focus-visible': { outline: `2px solid ${accent}`, outlineOffset: 3 },
              }}
            >
              {isPayBox ? <Box component="img" src="/paybox-logo.png" alt="" sx={{ width: 20, height: 20, borderRadius: 0.5, flexShrink: 0 }} /> : <QrCode2OutlinedIcon sx={{ fontSize: 18 }} />}
              {isPayBox ? 'מתנה לחתן ולכלה ב-PayBox' : 'מתנה לכלה ב-Bit'}
            </Box>
          )}

          {!isPayBox && groomUrl && (
            <Box
              component={isDemo ? 'button' : 'a'}
              type={isDemo ? 'button' : undefined}
              href={isDemo ? undefined : groomUrl}
              target={isDemo ? undefined : '_blank'}
              rel={isDemo ? undefined : 'noopener noreferrer'}
              onClick={isDemo ? onDemoClick : undefined}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                py: 1.15,
                px: 1.5,
                borderRadius: isPayBox ? 1 : 50,
                border: `1.5px solid ${border}`,
                color: accent,
                fontFamily: "'Heebo', sans-serif",
                fontWeight: 700,
                fontSize: '0.88rem',
                textDecoration: 'none',
                background: 'rgba(255,255,255,0.75)',
                transition: 'all 0.22s ease',
                cursor: 'pointer',
                width: '100%',
                outline: 'none',
                '&:hover': { transform: 'translateY(-2px)', background: hoverBackground },
                '&:focus-visible': { outline: `2px solid ${accent}`, outlineOffset: 3 },
              }}
            >
              {isPayBox ? <Box component="img" src="/paybox-logo.png" alt="" sx={{ width: 20, height: 20, borderRadius: 0.5, flexShrink: 0 }} /> : <QrCode2OutlinedIcon sx={{ fontSize: 18 }} />}
              מתנה לחתן ב-{provider}
            </Box>
          )}
        </Box>
      </Box>
    </GoldCard>
  );
}

// ─── Skeleton ────────────────────────────────────────────────

function InfoSkeleton() {
  return (
    <Box sx={{ p: 3 }}>
      {[...Array(4)].map((_, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
          <Skeleton variant="circular" width={44} height={44} />
          <Box sx={{ flex: 1 }}>
            <Skeleton width="40%" height={14} sx={{ mb: 0.5 }} />
            <Skeleton width="70%" height={20} />
          </Box>
        </Box>
      ))}
    </Box>
  );
}

// ─── Main ───────────────────────────────────────────────────

type Props = {
  demoInfo?: WeddingInfo;
  hideRegisterCta?: boolean;
};

export default function InfoTab({ demoInfo, hideRegisterCta = false }: Props) {
  const {
    info,
    loading,
    error,
  } = useWeddingInfo();

  const resolvedInfo = demoInfo ?? info;
  const compactDemo = Boolean(demoInfo);
  const brideBitUrl = toSafeExternalUrl(resolvedInfo?.bride_bit_url);
  const groomBitUrl = toSafeExternalUrl(resolvedInfo?.groom_bit_url);
  const payboxUrl = toSafeExternalUrl(resolvedInfo?.paybox_url);
  const [giftDemoProvider, setGiftDemoProvider] = useState<'Bit' | 'PayBox' | null>(null);
  const [isFoodBlessingOpen, setIsFoodBlessingOpen] = useState(false);
  const [isRideCoordinationOpen, setIsRideCoordinationOpen] = useState(false);
  const [calendarErrorOpen, setCalendarErrorOpen] = useState(false);

  const handleAddToCalendar = async () => {
    try {
      await downloadWeddingCalendar();
    } catch {
      setCalendarErrorOpen(true);
    }
  };

  if (!demoInfo && loading) {
    return <InfoSkeleton />;
  }

  if (!demoInfo && error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!resolvedInfo) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error">לא נמצאו פרטי חתונה.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 2 } }}>
      {/* Info rows */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.8, mt: -3 }}>
        <Box sx={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.22)' }} />
        <Typography sx={{ color: '#C9A84C', fontSize: '0.8rem' }}>✦</Typography>
        <Box sx={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.22)' }} />
      </Box>
      <GoldCard delay={0.05} sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography
            variant="caption"
            sx={{ fontSize: compactDemo ? '12px' : '14px', color: '#A08070', display: 'block', fontWeight: 500 }}
          >
            פרטי האירוע
          </Typography>
          {!compactDemo && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ButtonBase
                aria-label="הוספה ליומן"
                onClick={handleAddToCalendar}
                sx={{ color: '#A08070', fontSize: '0.7rem', borderRadius: 0.5 }}
              >
                הוספה ליומן
              </ButtonBase>
              <IconButton
                aria-label="הוספה ליומן"
                onClick={handleAddToCalendar}
                size="small"
                sx={{ color: '#9A7833' }}
              >
                <CalendarMonthIcon fontSize="small" />
              </IconButton>
            </Box>
          )}
        </Box>
        <InfoRow icon={<CalendarMonthIcon sx={{ fontSize: compactDemo ? 18 : 20 }} />} label="תאריך" value={formatHebrewDate(resolvedInfo.wedding_date)} delay={0.05} compact={compactDemo} />
        <Divider sx={{ borderColor: 'rgba(201,168,76,0.15)' }} />
        <InfoRow icon={<AccessTimeIcon sx={{ fontSize: compactDemo ? 18 : 20 }} />} label="קבלת פנים" value={`${resolvedInfo.wedding_time.slice(0, 5)}`} delay={0.12} compact={compactDemo} />
        <Divider sx={{ borderColor: 'rgba(201,168,76,0.15)' }} />
        <InfoRow icon={<AccessTimeIcon sx={{ fontSize: compactDemo ? 18 : 20 }} />} label="חופה" value={`${resolvedInfo.wedding_canpoy_time.slice(0, 5)}`} delay={0.19} compact={compactDemo} />
        <Divider sx={{ borderColor: 'rgba(201,168,76,0.15)' }} />
        <InfoRow icon={<LocationOnIcon sx={{ fontSize: compactDemo ? 18 : 20 }} />} label="מיקום" value={`${resolvedInfo.venue_name} — ${resolvedInfo.venue_address}`} delay={0.26} compact={compactDemo} />
        {resolvedInfo.dress_code && (
          <>
            <Divider sx={{ borderColor: 'rgba(201,168,76,0.15)' }} />
            <InfoRow icon={<CheckroomIcon sx={{ fontSize: compactDemo ? 18 : 20 }} />} label="קוד לבוש" value={resolvedInfo.dress_code} delay={0.26} compact={compactDemo} />
          </>
        )}
        {resolvedInfo.notes && (
          <>
            <Divider sx={{ borderColor: 'rgba(201,168,76,0.15)' }} />
            <InfoRow icon={<NoteIcon sx={{ fontSize: compactDemo ? 18 : 20 }} />} label="הערות" value={resolvedInfo.notes} delay={0.33} compact={compactDemo} />
          </>
        )}
      </GoldCard>

      {/* Map buttons */}
      <GoldCard delay={0.2} sx={{ mb: 2 }}>
        <MapButtons info={resolvedInfo} />
        {!compactDemo && (
          <Box component="section" aria-labelledby="ride-coordination-title" sx={{ mt: 1.75, pt: 1.5, borderTop: '1px solid rgba(201,168,76,0.2)' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                flexWrap: 'wrap',
                p: 1.25,
                pt: 1.5,
                pb: 1.5,
                justifyContent: 'center',
                borderRadius: 2,
                border: '1px solid rgba(201,168,76,0.24)',
                background: 'linear-gradient(110deg, rgba(255,255,255,0.88), rgba(248,241,222,0.82))',
              }}
            >
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0, justifyContent: 'center' }}>

                <Typography id="ride-coordination-title" fontWeight={700} color="#73552B" sx={{ lineHeight: 1.25 }}>
                  מגיעים יחד
                </Typography>
                <Typography variant="caption" color="#806D61">
                  מחפשים טרמפ ? רוצים להציע טרמפ ? נסו כאן              </Typography>
              </Box>
              <Button
                variant="contained"
                onClick={() => setIsRideCoordinationOpen(true)}
                sx={{
                  flexShrink: 0,
                  minWidth: 0,
                  px: 1.85,
                  py: 0.75,
                  color: '#fff',
                  background: '#9A7833',
                  boxShadow: 'none',
                  '&:hover': { background: '#806327', boxShadow: 'none' },
                }}
                startIcon={<DirectionsCarIcon sx={{ fontSize: 22 }} />}
              >
                לתיאום נסיעה
              </Button>
            </Box>
          </Box>
        )}
      </GoldCard>
      {!compactDemo && (
        <RideCoordinationModal
          open={isRideCoordinationOpen}
          onClose={() => setIsRideCoordinationOpen(false)}
          receptionTime={resolvedInfo.wedding_time}
        />
      )}

      {(brideBitUrl || groomBitUrl) && (
        <GiftButtons
          brideUrl={brideBitUrl}
          groomUrl={groomBitUrl}
          isDemo={compactDemo}
          onDemoClick={() => setGiftDemoProvider('Bit')}
        />
      )}
      {payboxUrl && (
        <GiftButtons
          provider="PayBox"
          groupUrl={payboxUrl}
          isDemo={compactDemo}
          onDemoClick={() => setGiftDemoProvider('PayBox')}
        />
      )}

      <GuestBlessing recipient={`${resolvedInfo.bride_name} ו${resolvedInfo.groom_name}`} demo={compactDemo} />

      <GoldCard delay={0.28} sx={{ mb: 2, background: 'rgba(255,255,255,0.94)' }}>
        <Box component="section" aria-label="ברכת המזון">
          <ButtonBase
            aria-haspopup="dialog"
            aria-controls={isFoodBlessingOpen ? 'food-blessing-dialog' : undefined}
            onClick={() => setIsFoodBlessingOpen(true)}
            sx={{
              width: '100%',
              minHeight: 58,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.25,
              borderRadius: 1.5,
              color: '#73552B',
              '&:hover .food-blessing-icon': { background: 'rgba(201,168,76,0.2)' },
              '&:focus-visible': { outline: '2px solid #9A7833', outlineOffset: 3 },
            }}
          >
            <Box
              className="food-blessing-icon"
              sx={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                color: '#9A7833',
                background: 'rgba(201,168,76,0.11)',
                border: '1px solid rgba(201,168,76,0.28)',
                transition: 'background 0.2s ease',
              }}
            >
              <MenuBookOutlinedIcon sx={{ fontSize: 21 }} />
            </Box>
            <Typography component="span" sx={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: '1.2rem', fontWeight: 600 }}>
              ברכת המזון
            </Typography>
            <Box sx={{ width: 22, height: 1, bgcolor: 'rgba(201,168,76,0.45)' }} />
          </ButtonBase>
        </Box>
      </GoldCard>

      {/* Countdown timer */}
      <GoldCard delay={0.3}>
        <CountdownTimer weddingDate={resolvedInfo.wedding_date} weddingTime={resolvedInfo.wedding_time} compact={compactDemo} />
      </GoldCard>

      {!hideRegisterCta && (
        <GoldCard delay={0.4} sx={{ mt: 2, textAlign: 'center' }}>
          <WeddingRegisterCTA mt={1} />
        </GoldCard>
      )}

      <Dialog open={giftDemoProvider !== null} onClose={() => setGiftDemoProvider(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#9A7833', fontWeight: 700 }}>הדגמה</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#6F5547', lineHeight: 1.7 }}>
            {giftDemoProvider === 'PayBox' ? 'הלחיצה על הקישור תוביל לקבוצת PayBox של האירוע למתן מתנה.' : 'הלחיצה על הקישור תוביל למתן מתנה ישיר בביט.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setGiftDemoProvider(null)}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #C9A84C, #9A7833)',
              color: '#FAF7F2',
              textTransform: 'none',
              '&:hover': { background: 'linear-gradient(135deg, #E0C97A, #C9A84C)' },
            }}
          >
            הבנתי
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={isFoodBlessingOpen}
        onClose={() => setIsFoodBlessingOpen(false)}
        fullWidth
        maxWidth="sm"
        scroll="paper"
        dir="rtl"
        aria-labelledby="food-blessing-title"
        aria-describedby="food-blessing-content"
        PaperProps={{
          id: 'food-blessing-dialog',
          dir: 'rtl',
          sx: {
            maxHeight: 'calc(100dvh - 32px)',
            borderRadius: 2,
            border: '1px solid rgba(201,168,76,0.3)',
            background: 'linear-gradient(180deg, #FFFEFC 0%, #FCFAF7 100%)',
            boxShadow: '0 18px 60px rgba(44,24,16,0.2)',
          },
        }}
      >
        <DialogTitle
          id="food-blessing-title"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            px: { xs: 2, sm: 3 },
            pt: { xs: 2, sm: 2.5 },
            pb: 1.5,
            color: '#73552B',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <MenuBookOutlinedIcon sx={{ color: '#9A7833', fontSize: 24 }} />
            <Typography component="span" sx={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: '1.6rem', fontWeight: 600 }}>
              ברכת המזון
            </Typography>
          </Box>
          <IconButton aria-label="סגירה" onClick={() => setIsFoodBlessingOpen(false)} size="small" sx={{ color: '#806D61' }}>
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: { xs: 2, sm: 3 } }} aria-hidden="true">
          <Box sx={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.28)' }} />
          <Typography sx={{ color: '#C9A84C', fontSize: '0.8rem', lineHeight: 1 }}>✦</Typography>
          <Box sx={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.28)' }} />
        </Box>
        <DialogContent id="food-blessing-content" dir="rtl" sx={{ px: { xs: 2.5, sm: 3.5 }, py: { xs: 2, sm: 2.5 } }}>
          <Typography
            component="p"
            sx={{
              m: 0,
              pb: 1,
              color: '#3C3430',
              fontFamily: "'Frank Ruhl Libre', serif",
              fontSize: { xs: '1.08rem', sm: '1.2rem' },
              lineHeight: { xs: 2, sm: 2.1 },
              textAlign: 'left',
              overflowWrap: 'anywhere',
            }}
          >
            {foodBlessing}
          </Typography>
        </DialogContent>
        <DialogActions dir="rtl" sx={{ px: { xs: 2, sm: 3 }, pb: 2.5, pt: 0.5 }}>
          <Button
            onClick={() => setIsFoodBlessingOpen(false)}
            variant="contained"
            sx={{
              minWidth: 96,
              borderRadius: 1,
              mt: 1.5,
              background: 'linear-gradient(135deg, #C9A84C, #9A7833)',
              color: '#FFFEFC',
              '&:hover': { background: 'linear-gradient(135deg, #B8953F, #826326)' },
            }}
          >
            סגירה
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={calendarErrorOpen}
        autoHideDuration={5000}
        onClose={() => setCalendarErrorOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setCalendarErrorOpen(false)} severity="error" variant="filled">
          לא הצלחנו ליצור את האירוע ליומן. נסו שוב.
        </Alert>
      </Snackbar>
    </Box>
  );
}
