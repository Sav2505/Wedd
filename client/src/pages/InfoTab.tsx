import {
  Box, Typography, Skeleton, Chip, Divider,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CheckroomIcon from '@mui/icons-material/Checkroom';
import NoteIcon from '@mui/icons-material/Note';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import MapIcon from '@mui/icons-material/Map';
import { motion } from 'framer-motion';
import { WeddingInfo } from '../types/domain';
import GoldCard from '../components/GoldCard';
import CountdownTimer from '../components/CountdownTimer';
import WeddingRegisterCTA from '../components/WeddingRegisterCTA';
import { useWeddingInfo } from '../hooks/useWeddingInfo';

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
  icon, label, value, delay = 0,
}: {
  icon: React.ReactNode; label: string; value: string; delay?: number;
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
          gap: 2,
          py: 2,
        }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
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
            sx={{ color: '#A08070', display: 'block', mb: 0.25, fontWeight: 500 }}
          >
            {label}
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: '#2C1810', fontWeight: 500, lineHeight: 1.5 }}
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

export default function InfoTab() {
  const {
    info,
    loading,
    error,
  } = useWeddingInfo();

  if (loading) {
    return <InfoSkeleton />;
  }

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!info) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="error">לא נמצאו פרטי חתונה.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Hero heading */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <Box sx={{ textAlign: 'center', mb: 3.5 }}>
          <Typography
            variant="h4"
            sx={{
              fontFamily: "'Frank Ruhl Libre', serif",
              fontWeight: 700,
              background: 'linear-gradient(135deg, #C9A84C, #9A7833)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 0.5,
            }}
          >
            {info.groom_name} &amp; {info.bride_name}
          </Typography>
          <Typography variant="body2" sx={{ color: '#A08070' }}>
            מתחתנים! 🎉
          </Typography>
        </Box>
      </motion.div>

      {/* Divider */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Box sx={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.25)' }} />
        <Typography sx={{ color: '#C9A84C' }}>✦</Typography>
        <Box sx={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.25)' }} />
      </Box>

      {/* Info rows */}
      <GoldCard delay={0.05} sx={{ mb: 2 }}>
        <InfoRow icon={<CalendarMonthIcon sx={{ fontSize: 20 }} />} label="תאריך" value={formatHebrewDate(info.wedding_date)} delay={0.05} />
        <Divider sx={{ borderColor: 'rgba(201,168,76,0.15)' }} />
        <InfoRow icon={<AccessTimeIcon sx={{ fontSize: 20 }} />} label="קבלת פנים" value={`${info.wedding_time.slice(0, 5)}`} delay={0.12} />
        <Divider sx={{ borderColor: 'rgba(201,168,76,0.15)' }} />
        <InfoRow icon={<AccessTimeIcon sx={{ fontSize: 20 }} />} label="חופה" value={`${info.wedding_canpoy_time.slice(0, 5)}`} delay={0.19} />
        <Divider sx={{ borderColor: 'rgba(201,168,76,0.15)' }} />
        <InfoRow icon={<LocationOnIcon sx={{ fontSize: 20 }} />} label="מיקום" value={`${info.venue_name} — ${info.venue_address}`} delay={0.26} />
        {info.dress_code && (
          <>
            <Divider sx={{ borderColor: 'rgba(201,168,76,0.15)' }} />
            <InfoRow icon={<CheckroomIcon sx={{ fontSize: 20 }} />} label="קוד לבוש" value={info.dress_code} delay={0.26} />
          </>
        )}
        {info.notes && (
          <>
            <Divider sx={{ borderColor: 'rgba(201,168,76,0.15)' }} />
            <InfoRow icon={<NoteIcon sx={{ fontSize: 20 }} />} label="הערות" value={info.notes} delay={0.33} />
          </>
        )}
      </GoldCard>

      {/* Map buttons */}
      <GoldCard delay={0.2} sx={{ mb: 2 }}>
        <MapButtons info={info} />
      </GoldCard>

      {/* Countdown timer */}
      <GoldCard delay={0.3}>
        <CountdownTimer weddingDate={info.wedding_date} />
      </GoldCard>

      {/* Dress code badge */}
      {info.dress_code && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <Chip
              label={`קוד לבוש: ${info.dress_code}`}
              sx={{
                background: 'linear-gradient(135deg, rgba(224,201,122,0.2), rgba(201,168,76,0.12))',
                border: '1px solid rgba(201,168,76,0.35)',
                color: '#9A7833',
                fontWeight: 600,
                fontSize: '0.82rem',
                px: 1,
              }}
            />
          </Box>
        </motion.div>
      )}

      {/* Sign up */}
      <GoldCard delay={0.4} sx={{ mt: 2, textAlign: 'center' }}>
        <WeddingRegisterCTA mt={1} />
      </GoldCard>
    </Box>
  );
}
