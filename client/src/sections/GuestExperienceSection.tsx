import { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import { fadeUp, fadeUpCard, staggerContainer, scrollReveal, palette } from '../shared/animations';
import GuestAppMockup from '../components/GuestAppMockup';
import GuestJourneyShowcaseModal from '../components/GuestJourneyShowcaseModal';

const features = [
    'אישור הגעה בלחיצה',
    'ניווט מהיר ב-Waze',
    'הודעה אישית מהזוג',
    'גלריית תמונות משותפת',
    'צפייה במיקום הישיבה',
    'חוויה דיגיטלית מרשימה',
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
                        <Typography sx={{ color: palette.gold, fontWeight: 700, letterSpacing: '0.04em', mb: 1 }}>
                            📲 גם האורחים נהנים
                        </Typography>
                        <Typography
                            sx={{
                                fontFamily: "'Frank Ruhl Libre', serif",
                                fontWeight: 700,
                                fontSize: { xs: '1.6rem', sm: '2rem' },
                                color: palette.textDark,
                                mb: 2,
                            }}
                        >
                            חוויה שהאורחים יאהבו
                        </Typography>
                    </motion.div>

                    <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                        {features.map((f) => (
                            <motion.li
                                key={f}
                                variants={fadeUp}
                                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}
                            >
                                <CheckCircleIcon sx={{ color: palette.gold, fontSize: 20, mt: '2px' }} />
                                <Typography sx={{ color: palette.textDark, fontSize: '0.98rem' }}>{f}</Typography>
                            </motion.li>
                        ))}
                    </Box>

                    <motion.div variants={fadeUp}>
                        <Typography sx={{ mt: 1, color: palette.textMuted, fontSize: '0.92rem', lineHeight: 1.8 }}>
                            כל אורח מקבל בדיוק את מה שהוא צריך, בזמן הנכון.
                        </Typography>
                    </motion.div>
                </motion.div>

                <motion.div {...scrollReveal} variants={fadeUpCard}>
                    <GuestAppMockup />
                    <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                        <Button
                            variant="contained"
                            endIcon={<VisibilityRoundedIcon />}
                            onClick={() => setJourneyOpen(true)}
                            sx={{
                                mt: 1.3,
                                background: 'linear-gradient(135deg, #D8B65A, #B7892D)',
                                color: '#FFFDF8',
                                fontWeight: 800,
                                px: 2.6,
                                py: 0.95,
                                borderRadius: 999,
                                fontSize: '0.87rem',
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
                            הצצה לחוויית האורח
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