import { Box, Typography, Button } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { fadeUp, staggerContainer, palette } from '../shared/animations';

// Identical rings icon to the one used on WeddingRegisterPage / LoginPage,
// kept as-is so the two pages read as one continuous product.
function RingsIcon() {
    return (
        <svg width="84" height="84" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="26" cy="36" r="18" stroke="url(#showcaseGold)" strokeWidth="3.5" fill="none" />
            <circle cx="46" cy="36" r="18" stroke="url(#showcaseGold2)" strokeWidth="3.5" fill="none" />
            <defs>
                <linearGradient id="showcaseGold" x1="8" y1="18" x2="44" y2="54" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#E0C97A" />
                    <stop offset="1" stopColor="#9A7833" />
                </linearGradient>
                <linearGradient id="showcaseGold2" x1="28" y1="18" x2="64" y2="54" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#E0C97A" />
                    <stop offset="1" stopColor="#9A7833" />
                </linearGradient>
            </defs>
        </svg>
    );
}

function scrollToNext() {
    const el = document.getElementById('showcase-why');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function ShowcaseHero() {
    const navigate = useNavigate();

    return (
        <Box
            sx={{
                minHeight: { xs: '92dvh', sm: '96dvh' },
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                px: 2,
                position: 'relative',
            }}
        >
            <motion.div variants={staggerContainer} initial="hidden" animate="show" style={{ maxWidth: 620 }}>
                <motion.div variants={fadeUp}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                        <motion.div
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <RingsIcon />
                        </motion.div>
                    </Box>
                </motion.div>

                <motion.div variants={fadeUp}>
                    <Typography
                        sx={{
                            fontFamily: "'Frank Ruhl Libre', serif",
                            fontWeight: 700,
                            fontSize: { xs: '2.4rem', sm: '3.2rem' },
                            color: palette.textDark,
                            lineHeight: 0.3,
                            letterSpacing: '0.04em',
                        }}
                    >
                        <span style={{ color: palette.textMuted, fontWeight: 700 }}>
                            WedFlow
                        </span>
                    </Typography>
                    <Typography
                        sx={{
                            fontFamily: "'Frank Ruhl Libre', serif",
                            fontWeight: 700,
                            fontSize: { xs: '2.1rem', sm: '3rem' },
                            color: palette.textDark,
                            lineHeight: 1.2,
                            letterSpacing: '0.01em',
                        }}
                    >
                        <br />
                        כל החתונה.
                        <br />
                        במקום אחד.
                    </Typography>
                </motion.div>

                <motion.div variants={fadeUp}>
                    <Typography
                        sx={{
                            mt: 2.5,
                            color: palette.textMuted,
                            fontSize: { xs: '1rem', sm: '1.15rem' },
                            lineHeight: 1.8,
                            maxWidth: 480,
                            mx: 'auto',
                        }}
                    >
                        אפליקציית החתונה שמנהלת את כל האירוע — משלב ההכנות, דרך אישורי הגעה ועד
                        התמונות שאחרי האירוע. בלי אקסלים, בלי עוד מערכות, בלי בלגן.
                        הכל מסונכרן ומרוכז במקום אחד.
                        <br />
                        <span style={{ fontWeight: "bold" }}>במחיר הכי משתלם בשוק</span>
                    </Typography>
                </motion.div>

                <motion.div variants={fadeUp}>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={() => navigate('/register')}
                        className="shimmer-btn"
                        sx={{
                            mt: 4.5,
                            height: 54,
                            px: 5,
                            fontSize: '1.05rem',
                            fontWeight: 700,
                            letterSpacing: '0.02em',
                        }}
                    >
                        אני רוצה גם מערכת כזאת 💍
                    </Button>
                </motion.div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1, duration: 0.8 }}
                style={{ position: 'absolute', bottom: 28 }}
            >
                <Box
                    onClick={scrollToNext}
                    sx={{ cursor: 'pointer', display: 'flex', justifyContent: 'center' }}
                >
                    <motion.div
                        animate={{ y: [0, 8, 0] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        <KeyboardArrowDownIcon sx={{ color: 'rgba(201,168,76,0.6)', fontSize: 30 }} />
                    </motion.div>
                </Box>
            </motion.div>
        </Box>
    );
}