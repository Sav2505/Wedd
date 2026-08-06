import { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import { fadeUp, fadeUpCard, staggerContainer, scrollReveal, palette } from '../shared/animations';
import GuestAppMockup from '../components/GuestAppMockup';
import GuestJourneyShowcaseModal from '../components/GuestJourneyShowcaseModal';

const features = [
    { icon: '📩', text: 'הזמנה דיגיטלית ב-WhatsApp' },
    { icon: '✅', text: 'אישור הגעה בשתי שניות' },
    { icon: '📍', text: 'ניווט ישיר למקום' },
    { icon: '🪑', text: 'מיקום הישיבה האישי' },
    { icon: '📸', text: 'גלריה משותפת לכל האורחים' },
    { icon: '💌', text: 'הקדשה אישית מהזוג' },
];

export default function GuestExperienceSection() {
    const [journeyOpen, setJourneyOpen] = useState(false);

    return (
        <Box sx={{ px: 2, py: { xs: 7, sm: 10 } }}>
            <Box
                sx={{
                    maxWidth: 1040,
                    mx: 'auto',
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                    gap: { xs: 5, md: 8 },
                    alignItems: 'center',
                }}
            >
                <motion.div {...scrollReveal} variants={staggerContainer}>
                    <motion.div variants={fadeUp}>
                        <Typography sx={{ color: palette.gold, fontWeight: 700, letterSpacing: '0.05em', mb: 1, fontSize: '0.85rem', textTransform: 'uppercase' }}>
                            תצוגה מקדימה אמיתית
                        </Typography>
                        <Typography
                            sx={{
                                fontFamily: "'Frank Ruhl Libre', serif",
                                fontWeight: 700,
                                fontSize: { xs: '1.75rem', sm: '2.2rem' },
                                color: palette.textDark,
                                lineHeight: 1.25,
                                mb: 0.8,
                            }}
                        >
                            כך האורחים שלכם<br />יראו את החתונה
                        </Typography>
                        <Typography sx={{ color: palette.textMuted, fontSize: '0.95rem', mb: 2.5, lineHeight: 1.6 }}>
                            מה שאתם רואים כאן - סקיצה קטנה ממה שהאורח יראה.
                        </Typography>
                    </motion.div>

                    <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                        {features.map((f) => (
                            <motion.li
                                key={f.text}
                                variants={fadeUp}
                                style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}
                            >
                                <Box
                                    sx={{
                                        width: 34,
                                        height: 34,
                                        borderRadius: '50%',
                                        background: 'rgba(201,168,76,0.12)',
                                        border: '1px solid rgba(201,168,76,0.28)',
                                        display: 'grid',
                                        placeItems: 'center',
                                        fontSize: '1rem',
                                        flexShrink: 0,
                                    }}
                                >
                                    {f.icon}
                                </Box>
                                <Typography sx={{ color: palette.textDark, fontSize: '0.95rem', fontWeight: 600 }}>{f.text}</Typography>
                            </motion.li>
                        ))}
                    </Box>

                    <motion.div variants={fadeUp}>
                        <Typography sx={{ mt: 2, color: palette.textMuted, fontSize: '0.88rem' }}>
                            כל מה שהאורח צריך לדעת
                        </Typography>
                    </motion.div>
                </motion.div>

                <motion.div {...scrollReveal} variants={fadeUpCard}>
                    <GuestAppMockup />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: 8 }}>
                        <Button
                            variant="contained"
                            endIcon={<VisibilityRoundedIcon />}
                            onClick={() => setJourneyOpen(true)}
                            sx={{
                                background: 'linear-gradient(135deg, #D8B65A, #B7892D)',
                                color: '#FFFDF8',
                                fontWeight: 800,
                                px: 2.8,
                                py: 1.05,
                                borderRadius: 999,
                                fontSize: '0.9rem',
                                letterSpacing: '0.01em',
                                boxShadow: '0 12px 28px rgba(154,120,51,0.36)',
                                border: '1px solid rgba(255,255,255,0.22)',
                                transition: 'transform 0.22s ease, box-shadow 0.22s ease, filter 0.22s ease',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #E3C571, #C09238)',
                                    transform: 'translateY(-2px) scale(1.01)',
                                    boxShadow: '0 16px 34px rgba(154,120,51,0.42)',
                                    filter: 'saturate(1.05)',
                                },
                                '&:active': { transform: 'translateY(0)' },
                            }}
                        >
                            צפו בחוויית האורח
                        </Button>
                    </div>
                </motion.div>
            </Box>

            {journeyOpen && (
                <GuestJourneyShowcaseModal open={journeyOpen} onClose={() => setJourneyOpen(false)} />
            )}
        </Box>
    );
}