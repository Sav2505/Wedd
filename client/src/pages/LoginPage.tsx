import React, { useEffect, useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { useAppDispatch } from '../store';
import { setGuest } from '../store/authSlice';
import { login } from '../services/auth.service';
import FallingPetals from '../components/FallingPetals';
import { parseGuestParams } from '../utils/guestUrl';

// ─── Decorative SVG ring ────────────────────────────────────

function RingsIcon() {
  return (
    <svg
      width="72"
      height="72"
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="26" cy="36" r="18" stroke="#C9A84C" strokeWidth="3.5" fill="none" />
      <circle cx="46" cy="36" r="18" stroke="#C9A84C" strokeWidth="3.5" fill="none" />
      <circle cx="26" cy="36" r="18" stroke="url(#gold)" strokeWidth="3.5" fill="none" />
      <circle cx="46" cy="36" r="18" stroke="url(#gold2)" strokeWidth="3.5" fill="none" />
      <defs>
        <linearGradient id="gold" x1="8" y1="18" x2="44" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E0C97A" />
          <stop offset="1" stopColor="#9A7833" />
        </linearGradient>
        <linearGradient id="gold2" x1="28" y1="18" x2="64" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E0C97A" />
          <stop offset="1" stopColor="#9A7833" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── Floating floral decoration ────────────────────────────

function FloralDecor({ top, right, left, bottom, size = 180, opacity = 0.12, rotate = 0 }: {
  top?: string | number; right?: string | number;
  left?: string | number; bottom?: string | number;
  size?: number; opacity?: number; rotate?: number;
}) {
  return (
    <Box
      component="div"
      sx={{
        position: 'absolute',
        top, right, left, bottom,
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(201,168,76,0.5) 0%, transparent 70%)',
        opacity,
        transform: `rotate(${rotate}deg)`,
        pointerEvents: 'none',
        filter: 'blur(2px)',
      }}
    />
  );
}

// ─── Animation variants ─────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as const } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.97 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.7, ease: 'easeOut' as const },
  },
};

// ─── Component ──────────────────────────────────────────────

export default function LoginPage() {
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();

  const [fullName, setFullName]               = useState('');
  const [lastFourDigits, setLastFourDigits]   = useState('');
  const [error, setError]                     = useState<string | null>(null);
  const [loading, setLoading]                 = useState(false);

  // ─── Auto-login from URL params (?n=<name>&p=<last4>) ──────
  useEffect(() => {
    const creds = parseGuestParams(searchParams);
    if (!creds) return;

    setLoading(true);
    login({ fullName: creds.fullName, lastFourDigits: creds.lastFourDigits })
      .then(({ guest }) => {
        dispatch(setGuest(guest));
        // Remove credentials from the browser's address bar / history
        window.history.replaceState({}, '', window.location.pathname);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'שגיאה בהתחברות אוטומטית');
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('נא להזין שם מלא');
      return;
    }
    if (!/^\d{4}$/.test(lastFourDigits)) {
      setError('נא להזין 4 ספרות בלבד');
      return;
    }

    setLoading(true);
    try {
      const { guest } = await login({ fullName: fullName.trim(), lastFourDigits });
      dispatch(setGuest(guest));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהתחברות');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background:
          'radial-gradient(ellipse at 20% 50%, rgba(224,201,122,0.15) 0%, transparent 60%),' +
          'radial-gradient(ellipse at 80% 20%, rgba(201,168,76,0.12) 0%, transparent 55%),' +
          'radial-gradient(ellipse at 60% 85%, rgba(245,237,217,0.4) 0%, transparent 60%),' +
          'linear-gradient(160deg, #FAF7F2 0%, #F5EDD9 50%, #FAF7F2 100%)',
        px: 2,
        py: { xs: 2, sm: 4 },
      }}
    >
      {/* Falling petals */}
      <FallingPetals />

      {/* Decorative floral blobs */}
      <FloralDecor top="-80px"   right="-80px"  size={320} opacity={0.14} />
      <FloralDecor bottom="-60px" left="-60px"  size={280} opacity={0.12} />
      <FloralDecor top="40%"     right="-40px"  size={180} opacity={0.08} />
      <FloralDecor top="20%"     left="-50px"   size={200} opacity={0.09} rotate={45} />

      {/* Card */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="show"
        style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}
      >
        <Box
          sx={{
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '28px',
            border: '1px solid rgba(201,168,76,0.2)',
            boxShadow:
              '0 4px 24px rgba(44,24,16,0.08), 0 20px 60px rgba(44,24,16,0.10)',
            p: { xs: 4, sm: 5 },
          }}
        >
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {/* Rings icon */}
            <motion.div variants={itemVariants}>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <RingsIcon />
                </motion.div>
              </Box>
            </motion.div>

            {/* Title */}
            <motion.div variants={itemVariants}>
              <Typography
                variant="h4"
                align="center"
                sx={{
                  fontFamily: "'Frank Ruhl Libre', serif",
                  fontWeight: 700,
                  color: '#2C1810',
                  mb: 0.5,
                  letterSpacing: '0.01em',
                }}
              >
                ברוכים הבאים
              </Typography>
              <Typography
                variant="subtitle1"
                align="center"
                sx={{
                  color: '#C9A84C',
                  fontWeight: 500,
                  letterSpacing: '0.03em',
                  mb: 3,
                }}
              >
                לחתונה שלנו 💍
              </Typography>
            </motion.div>

            {/* Divider */}
            <motion.div variants={itemVariants}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  mb: 3.5,
                }}
              >
                <Box sx={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.25)' }} />
                <Typography sx={{ color: '#C9A84C', fontSize: '1.1rem' }}>✦</Typography>
                <Box sx={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.25)' }} />
              </Box>
            </motion.div>

            {/* Form */}
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <motion.div variants={itemVariants}>
                <TextField
                  fullWidth
                  label="שם מלא"
                  placeholder="לדוגמה: ישראל ישראלי"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  autoComplete="name"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <PersonOutlineIcon sx={{ color: 'rgba(201,168,76,0.7)', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2.5 }}
                />
              </motion.div>

              <motion.div variants={itemVariants}>
                <TextField
                  fullWidth
                  label="4 ספרות אחרונות של הטלפון"
                  placeholder="לדוגמה: 4567"
                  value={lastFourDigits}
                  onChange={(e) =>
                    setLastFourDigits(e.target.value.replace(/\D/g, '').slice(0, 4))
                  }
                  disabled={loading}
                  inputMode="numeric"
                  autoComplete="tel"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <PhoneAndroidIcon sx={{ color: 'rgba(201,168,76,0.7)', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 1 }}
                />
              </motion.div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Alert
                      severity="error"
                      sx={{
                        mt: 1.5,
                        borderRadius: 3,
                        '& .MuiAlert-icon': { alignItems: 'center' },
                      }}
                    >
                      {error}
                    </Alert>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div variants={itemVariants}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
                  disabled={loading}
                  className={loading ? undefined : 'shimmer-btn'}
                  sx={{
                    mt: 1,
                    height: 52,
                    fontSize: '1.05rem',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} sx={{ color: 'rgba(255,255,255,0.85)' }} />
                  ) : (
                    'כניסה לחגיגה ✨'
                  )}
                </Button>
              </motion.div>
            </Box>

            {/* Footer note */}
            <motion.div variants={itemVariants}>
              <Typography
                variant="caption"
                align="center"
                display="block"
                sx={{ mt: 3, color: '#A08070', lineHeight: 1.6 }}
              >
                הזינו את שמכם המלא ו-4 הספרות האחרונות של מספר הטלפון
                <br />
                כפי שנרשמתם על ידי הזוג המאושר
              </Typography>
            </motion.div>
          </motion.div>
        </Box>
      </motion.div>
    </Box>
  );
}
