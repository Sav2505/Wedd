import React, { useState } from 'react';
import {
    Box,
    TextField,
    Button,
    Typography,
    Alert,
    CircularProgress,
    InputAdornment,
} from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import { motion, AnimatePresence } from 'framer-motion';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { heIL } from '@mui/x-date-pickers/locales';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/he';
import FallingPetals from '../components/FallingPetals';
import { createWeddingRequest } from '../services/weddingRequest.service';
import { datePickerSx } from './couple/WeddingInfoEditor';
import { notifyAdminNewWeddingRequest } from '../services/weddingRequestsAdmin.service';

dayjs.locale('he');

// ─── Decorative SVG ring (identical to LoginPage) ──────────

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

// ─── Floating floral decoration (identical to LoginPage) ───

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

// ─── Animation variants (identical to LoginPage) ───────────

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.12, delayChildren: 0.1 },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as const } },
};

const cardVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.97 },
    show: {
        opacity: 1, y: 0, scale: 1,
        transition: { duration: 0.7, ease: 'easeOut' as const },
    },
};

// ─── Component ──────────────────────────────────────────────

export default function WeddingRegisterPage() {
    const navigate = useNavigate();

    const [brideName, setBrideName] = useState('');
    const [groomName, setGroomName] = useState('');
    const [weddingDate, setWeddingDate] = useState<Dayjs | null>(null);
    const [contactPhone, setContactPhone] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!brideName.trim() || !groomName.trim()) {
            setError('נא להזין את שמות בני הזוג');
            return;
        }
        if (!weddingDate || !weddingDate.isValid()) {
            setError('נא לבחור תאריך לחתונה');
            return;
        }
        if (!contactEmail.trim() || contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
            setError('נא להזין כתובת אימייל תקינה');
            return;
        }

        setLoading(true);
        try {
            const req = await createWeddingRequest({
                bride_name: brideName.trim(),
                groom_name: groomName.trim(),
                wedding_date: weddingDate.format('YYYY-MM-DD'),
                email: contactEmail.trim(),
                phone_number: contactPhone.trim() ?? "",
            });
            if (req && req.id) {
                await notifyAdminNewWeddingRequest(req.id);
            }
            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'שגיאה בשליחת הבקשה');
        } finally {
            setLoading(false);
        }
    };

    return (
        <LocalizationProvider
            dateAdapter={AdapterDayjs}
            adapterLocale="he"
            localeText={heIL.components.MuiLocalizationProvider.defaultProps.localeText}
        >
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
                    // py: { xs: 2, sm: 4 },
                }}
            >
                {/* Falling petals */}
                <FallingPetals />

                {/* Decorative floral blobs */}
                <FloralDecor top="-80px" right="-80px" size={320} opacity={0.14} />
                <FloralDecor bottom="-60px" left="-60px" size={280} opacity={0.12} />
                <FloralDecor top="40%" right="-40px" size={180} opacity={0.08} />
                <FloralDecor top="20%" left="-50px" size={200} opacity={0.09} rotate={45} />

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
                            p: { xs: 4, sm: 4 },
                            maxHeight: '92vh',
                            overflowY: 'auto',
                        }}
                    >
                        <motion.div variants={containerVariants} initial="hidden" animate="show">
                            {/* Icon */}
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
                                    רוצים מערכת כזאת ?
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
                                    גם לחתונה שלכם 💍
                                </Typography>
                            </motion.div>

                            {/* Divider */}
                            <motion.div variants={itemVariants}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3.5 }}>
                                    <Box sx={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.25)' }} />
                                    <Typography sx={{ color: '#C9A84C', fontSize: '1.1rem' }}>✦</Typography>
                                    <Box sx={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.25)' }} />
                                </Box>
                            </motion.div>

                            {success ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.45, ease: 'easeOut' }}
                                >
                                    <Box
                                        sx={{
                                            mt: 1,
                                            mb: 1,
                                            p: 2.6,
                                            direction: 'rtl',
                                            borderRadius: 3,
                                            textAlign: 'center',
                                            background:
                                                'linear-gradient(135deg, rgba(224,201,122,0.20) 0%, rgba(255,255,255,0.82) 45%, rgba(201,168,76,0.16) 100%)',
                                            border: '1px solid rgba(201,168,76,0.26)',
                                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.75), 0 8px 24px rgba(154,120,51,0.10)',
                                        }}
                                    >
                                        <motion.div
                                            animate={{ scale: [1, 1.12, 1] }}
                                            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                                        >
                                            <Typography sx={{ fontSize: '2.4rem' }}>🎉</Typography>
                                        </motion.div>
                                        <Typography
                                            dir="rtl"
                                            sx={{
                                                fontFamily: "'Frank Ruhl Libre', serif",
                                                fontSize: { xs: '1.1rem', sm: '1.25rem' },
                                                fontWeight: 700,
                                                color: '#2C1810',
                                                mt: 1,
                                            }}
                                        >
                                            הבקשה נשלחה בהצלחה ! 💌
                                        </Typography>
                                        <Typography dir="rtl" sx={{ mt: 0.8, color: '#8A6A2B', fontSize: '0.92rem', lineHeight: 1.7 }}>
                                            ניצור איתכם קשר בהקדם כדי להקים
                                            <br />
                                            את מערכת החתונה שלכם ✨
                                        </Typography>

                                        <Button
                                            variant="text"
                                            onClick={() => navigate('/login')}
                                            sx={{ mt: 2.4, color: '#C9A84C', fontWeight: 600 }}
                                        >
                                            לחיצה לחזרה
                                        </Button>
                                    </Box>
                                </motion.div>
                            ) : (
                                <>
                                    {/* Form */}
                                    <Box component="form" onSubmit={handleSubmit} noValidate>
                                        <motion.div variants={itemVariants}>
                                            <TextField
                                                fullWidth
                                                label="שם הכלה"
                                                placeholder="לדוגמה: מיכל טולדנו"
                                                value={brideName}
                                                onChange={(e) => setBrideName(e.target.value)}
                                                disabled={loading}
                                                autoComplete="off"
                                                InputProps={{
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <FavoriteBorderIcon sx={{ color: 'rgba(201,168,76,0.7)', fontSize: 20 }} />
                                                        </InputAdornment>
                                                    ),
                                                }}
                                                sx={{ mb: 2.5 }}
                                            />
                                        </motion.div>

                                        <motion.div variants={itemVariants}>
                                            <TextField
                                                fullWidth
                                                label="שם החתן"
                                                placeholder="לדוגמה: עידן אלון"
                                                value={groomName}
                                                onChange={(e) => setGroomName(e.target.value)}
                                                disabled={loading}
                                                autoComplete="off"
                                                InputProps={{
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <FavoriteBorderIcon sx={{ color: 'rgba(201,168,76,0.7)', fontSize: 20 }} />
                                                        </InputAdornment>
                                                    ),
                                                }}
                                                sx={{ mb: 2.5 }}
                                            />
                                        </motion.div>

                                        <motion.div variants={itemVariants}>
                                            <DatePicker
                                                value={weddingDate}
                                                onChange={(newValue) => setWeddingDate(newValue)}
                                                disabled={loading}
                                                format="DD/MM/YYYY"
                                                slotProps={{
                                                    textField: {
                                                        fullWidth: true,
                                                        label: 'תאריך החתונה',
                                                        sx: {
                                                            ...datePickerSx, mb: 2.5
                                                        },
                                                    },
                                                    openPickerIcon: {
                                                        sx: { color: 'rgba(201,168,76,0.7)', fontSize: 20 },
                                                    },
                                                }}
                                            />
                                        </motion.div>

                                        <motion.div variants={itemVariants}>
                                            <TextField
                                                fullWidth
                                                label="מייל ליצירת קשר"
                                                placeholder="לדוגמה: example@gmail.com"
                                                value={contactEmail}
                                                onChange={(e) => setContactEmail(e.target.value)}
                                                disabled={loading}
                                                type="email"
                                                autoComplete="email"
                                                InputProps={{
                                                    endAdornment: (
                                                        <InputAdornment position="end">
                                                            <EmailOutlinedIcon sx={{ color: 'rgba(201,168,76,0.7)', fontSize: 20 }} />
                                                        </InputAdornment>
                                                    ),
                                                }}
                                                sx={{ mb: 2 }}
                                            />
                                        </motion.div>

                                        <motion.div variants={itemVariants}>
                                            <TextField
                                                fullWidth
                                                label="טלפון (לא חובה)"
                                                placeholder="לדוגמה: 0521234567"
                                                value={contactPhone}
                                                onChange={(e) =>
                                                    setContactPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
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
                                                sx={{ mb: 2 }}
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
                                                    'שליחת בקשת הרשמה 💍'
                                                )}
                                            </Button>
                                        </motion.div>
                                    </Box>

                                    {/* Footer note + back link */}
                                    <motion.div variants={itemVariants}>
                                        <Typography
                                            variant="caption"
                                            align="center"
                                            display="block"
                                            sx={{ mt: 3, color: '#A08070', lineHeight: 1.6 }}
                                        >
                                            נשלח אליכם פרטים ליצירת קשר בהמשך התהליך
                                        </Typography>

                                        <RouterLink
                                            to="/login"
                                            style={{ textDecoration: 'none' }}
                                        >
                                            <Box
                                                sx={{
                                                    mt: 2,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 0.6,
                                                    color: '#C9A84C',
                                                    fontWeight: 700,
                                                    fontSize: '0.95rem',
                                                    transition: '.2s',
                                                    '&:hover': { color: '#9A7833' },
                                                }}
                                            >
                                                <ArrowForwardIcon sx={{ fontSize: 18 }} />
                                                לחיצה לחזרה
                                            </Box>
                                        </RouterLink>
                                    </motion.div>
                                </>
                            )}
                        </motion.div>
                    </Box>
                </motion.div>
            </Box>
        </LocalizationProvider>
    );
}