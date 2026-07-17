import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NearMeIcon from '@mui/icons-material/NearMe';
import { fadeUp, fadeUpCard, staggerContainer, scrollReveal, palette } from '../shared/animations';
import MockupFrame from '../components/MockupFrame';

const features = [
    'אישור הגעה בלחיצה אחת, ישירות מוואטסאפ',
    'ניווט מהיר לאירוע דרך Waze',
    'הודעה אישית מהחתן והכלה',
    'גלריה משותפת לכל האורחים',
    'צפייה במיקום שלהם בשולחן (לבחירתכם)',
];

function GuestMockup() {
    return (
        <MockupFrame label="מסך אורח" maxWidth={330}>
            <Box sx={{ textAlign: 'center', py: 1 }}>
                <Typography sx={{ fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 700, fontSize: '1.1rem', color: palette.textDark }}>
                    מיכל & יוסי
                </Typography>
                <Typography sx={{ color: palette.textMuted, fontSize: '0.8rem', mt: 0.4 }}>
                    שמחים שתהיו איתנו! 💛
                </Typography>

                <Box
                    sx={{
                        mt: 2,
                        p: 1.6,
                        borderRadius: '14px',
                        background: 'rgba(201,168,76,0.08)',
                        border: '1px solid rgba(201,168,76,0.16)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 1,
                    }}
                >
                    <NearMeIcon sx={{ color: palette.gold, fontSize: 18 }} />
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: palette.textDark }}>
                        ניווט לאולם עם Waze
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, mt: 1.4 }}>
                    {['שולחן 12', 'גלריה', 'RSVP ✓'].map((chip) => (
                        <Box
                            key={chip}
                            sx={{
                                flex: 1,
                                py: 1,
                                borderRadius: '10px',
                                background: 'rgba(255,255,255,0.7)',
                                border: '1px solid rgba(201,168,76,0.18)',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                color: palette.textMuted,
                            }}
                        >
                            {chip}
                        </Box>
                    ))}
                </Box>
            </Box>
        </MockupFrame>
    );
}

export default function GuestExperienceSection() {
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
                            חוויה אחת לאורחים, בלי בלבול
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
                            בלי הודעות מיותרות, בלי לשלוח וואטסאפים אישיים לכל אורח —
                            כל אחד מקבל בדיוק את מה שהוא צריך, בזמן הנכון.
                        </Typography>
                    </motion.div>
                </motion.div>

                <motion.div {...scrollReveal} variants={fadeUpCard}>
                    <GuestMockup />
                </motion.div>
            </Box>
        </Box>
    );
}