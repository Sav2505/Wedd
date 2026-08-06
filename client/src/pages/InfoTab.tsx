import {
  Box, Typography, Skeleton, Divider, Dialog, DialogTitle, DialogContent, DialogActions, Button,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CheckroomIcon from '@mui/icons-material/Checkroom';
import NoteIcon from '@mui/icons-material/Note';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import MapIcon from '@mui/icons-material/Map';
import QrCode2OutlinedIcon from '@mui/icons-material/QrCode2Outlined';
import { motion } from 'framer-motion';
import { WeddingInfo } from '../types/domain';
import GoldCard from '../components/GoldCard';
import CountdownTimer from '../components/CountdownTimer';
import WeddingRegisterCTA from '../components/WeddingRegisterCTA';
import { useWeddingInfo } from '../hooks/useWeddingInfo';
import { palette } from '../shared/animations';
import { useState } from 'react';

// ─── helpers ────────────────────────────────────────────────

function formatHebrewDate(iso: string): string {
  // Use noon to avoid UTC→local timezone shift flipping the day
  const d = new Date(iso + 'T12:00:00');
  const weekday = d.toLocaleDateString('he-IL', { weekday: 'long' });
  const date = d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
  return `${weekday}, ${date}`;
}

function toSafeExternalUrl(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  try {
    const direct = new URL(trimmed);
    if (direct.protocol === 'http:' || direct.protocol === 'https:') return direct.toString();
    return null;
  } catch {
    try {
      const withProtocol = new URL(`https://${trimmed}`);
      if (withProtocol.protocol === 'https:') return withProtocol.toString();
      return null;
    } catch {
      return null;
    }
  }
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

// ─── Map buttons ────────────────────────────────────────────

function MapButtons({ info }: { info: WeddingInfo }) {
  const encoded = encodeURIComponent(info.venue_address);
  const wazeUrl = info.venue_lat && info.venue_lng
    ? `https://waze.com/ul?ll=${info.venue_lat},${info.venue_lng}&navigate=yes`
    : `https://waze.com/ul?q=${encoded}&navigate=yes`;
  const googleUrl = info.venue_lat && info.venue_lng
    ? `https://maps.google.com/?q=${info.venue_lat},${info.venue_lng}`
    : `https://maps.google.com/?q=${encoded}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4, ease: 'easeOut' }}
    >
      <Box sx={{ display: 'flex', gap: 1.5, mt: 1, flexWrap: 'wrap' }}>
        <Box
          component="a"
          href={wazeUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            flex: 1,
            minWidth: 130,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            py: 1.25,
            px: 2,
            borderRadius: 50,
            background: 'linear-gradient(135deg, #E0C97A, #C9A84C)',
            color: '#fff',
            fontFamily: "'Heebo', sans-serif",
            fontWeight: 600,
            fontSize: '0.9rem',
            textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(201,168,76,0.35)',
            transition: 'all 0.22s ease',
            '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 18px rgba(201,168,76,0.45)' },
          }}
        >
          <DirectionsCarIcon sx={{ fontSize: 18 }} />
          ניווט ב-Waze
        </Box>
        <Box
          component="a"
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            flex: 1,
            minWidth: 130,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            py: 1.25,
            px: 2,
            borderRadius: 50,
            border: '1.5px solid rgba(201,168,76,0.55)',
            color: '#9A7833',
            fontFamily: "'Heebo', sans-serif",
            fontWeight: 600,
            fontSize: '0.9rem',
            textDecoration: 'none',
            background: 'rgba(255,255,255,0.7)',
            transition: 'all 0.22s ease',
            '&:hover': { transform: 'translateY(-2px)', background: 'rgba(201,168,76,0.08)' },
          }}
        >
          <MapIcon sx={{ fontSize: 18 }} />
          Google Maps
        </Box>
      </Box>
    </motion.div>
  );
}

function GiftButtons({
  brideUrl,
  groomUrl,
  isDemo,
  onDemoClick,
}: {
  brideUrl: string | null;
  groomUrl: string | null;
  isDemo: boolean;
  onDemoClick: () => void;
}) {
  if (!brideUrl && !groomUrl) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.48, ease: 'easeOut' }}
    >
      <Box
        sx={{
          borderRadius: 2,
          p: 2,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.86) 0%, rgba(250,247,242,0.95) 100%)',
          border: '1px solid rgba(201,168,76,0.25)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
          <Box
            component="img"
            src="/bit-logo.png"
            alt="BIT"
            sx={{ width: 20, height: 20, objectFit: 'contain', borderRadius: '4px' }}
          />
          <Typography sx={{ color: palette.textMuted, fontWeight: 700, fontSize: '0.95rem' }}>
            מתנה לחתן/כלה
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: '#A08070', display: 'block', mb: 1.5 }}>
          ניתן לשלוח מתנה ב-Bit באמצעות לחיצה על הקישור
        </Typography>

        <Box sx={{ display: 'flex', gap: 1.1, flexDirection: 'column' }}>
          {brideUrl && (
            <Box
              component={isDemo ? 'button' : 'a'}
              href={isDemo ? undefined : brideUrl}
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
                borderRadius: 50,
                border: '1.5px solid rgba(201,168,76,0.55)',
                color: '#9A7833',
                fontFamily: "'Heebo', sans-serif",
                fontWeight: 700,
                fontSize: '0.88rem',
                textDecoration: 'none',
                background: 'rgba(255,255,255,0.75)',
                transition: 'all 0.22s ease',
                cursor: 'pointer',
                width: '100%',
                outline: 'none',
                '&:hover': { transform: 'translateY(-2px)', background: 'rgba(201,168,76,0.08)' },
              }}
            >
              <QrCode2OutlinedIcon sx={{ fontSize: 18 }} />
              מתנה לכלה ב-Bit
            </Box>
          )}

          {groomUrl && (
            <Box
              component={isDemo ? 'button' : 'a'}
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
                borderRadius: 50,
                border: '1.5px solid rgba(201,168,76,0.55)',
                color: '#9A7833',
                fontFamily: "'Heebo', sans-serif",
                fontWeight: 700,
                fontSize: '0.88rem',
                textDecoration: 'none',
                background: 'rgba(255,255,255,0.75)',
                transition: 'all 0.22s ease',
                cursor: 'pointer',
                width: '100%',
                outline: 'none',
                '&:hover': { transform: 'translateY(-2px)', background: 'rgba(201,168,76,0.08)' },
              }}
            >
              <QrCode2OutlinedIcon sx={{ fontSize: 18 }} />
              מתנה לחתן ב-Bit
            </Box>
          )}
        </Box>
      </Box>
    </motion.div>
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
  const [isBitDemoModalOpen, setIsBitDemoModalOpen] = useState(false);

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
        <Typography
          variant="caption"
          sx={{ fontSize: compactDemo ? '12px' : '14px', color: '#A08070', display: 'block', mb: 0.5, fontWeight: 500 }}
        >
          פרטי האירוע
        </Typography>
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
      </GoldCard>

      {(brideBitUrl || groomBitUrl) && (
        <GoldCard delay={0.25} sx={{ mb: 2 }}>
          <GiftButtons
            brideUrl={brideBitUrl}
            groomUrl={groomBitUrl}
            isDemo={compactDemo}
            onDemoClick={() => setIsBitDemoModalOpen(true)}
          />
        </GoldCard>
      )}

      {/* Countdown timer */}
      <GoldCard delay={0.3}>
        <CountdownTimer weddingDate={resolvedInfo.wedding_date} compact={compactDemo} />
      </GoldCard>

      {!hideRegisterCta && (
        <GoldCard delay={0.4} sx={{ mt: 2, textAlign: 'center' }}>
          <WeddingRegisterCTA mt={1} />
        </GoldCard>
      )}

      <Dialog open={isBitDemoModalOpen} onClose={() => setIsBitDemoModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#9A7833', fontWeight: 700 }}>הדגמה</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#6F5547', lineHeight: 1.7 }}>
            הלחיצה על הקישור תוביל למתן מתנה ישיר בביט.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setIsBitDemoModalOpen(false)}
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
    </Box>
  );
}
