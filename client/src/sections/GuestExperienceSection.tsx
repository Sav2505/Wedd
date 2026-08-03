import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { fadeUp, fadeUpCard, staggerContainer, scrollReveal, palette } from '../shared/animations';
import GuestAppMockup from '../components/GuestAppMockup';

const features = [
    'אישור הגעה בלחיצה אחת, ישירות מוואטסאפ',
    'ניווט מהיר לאירוע דרך Waze',
    'הודעה אישית מהחתן והכלה',
    'גלריה משותפת לכל האורחים',
    'צפייה במיקום שלהם בשולחן (לבחירתכם)',
    'האורחים נכנסים לאווירה עוד לפני האירוע בעזרת המערכת היפה שלכם'
];

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
                            חוויה נוחה וברורה לאורחים, בלי בלבול
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
                    <GuestAppMockup />
                    <Typography sx={{ mt: 2, ml: 6, fontSize: "14px", color: "rgba(0, 0, 0, 0.88)" }}>רק דוגמא קטנה ממה שהאורח רואה .. :)</Typography>
                </motion.div>
            </Box>
        </Box>
    );
}