import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { fadeUp, fadeUpCard, staggerContainer, scrollReveal, palette } from '../shared/animations';

const included = [
    'מערכת מלאה לחתן ולכלה',
    'אפליקציה מלאה לאורחים',
    'אישורי הגעה אוטומטיים',
    'סידורי הושבה',
    'גלריה משותפת',
    'ניהול הוצאות והכנסות',
    'ניהול משימות',
    'תמיכה לאורך כל הדרך',
];

export default function PricingSection() {
    return (
        <Box sx={{ px: 2, py: { xs: 7, sm: 10 } }}>
            <motion.div {...scrollReveal} variants={fadeUpCard} style={{ maxWidth: 560, margin: '0 auto' }}>
                <Box
                    sx={{
                        borderRadius: '28px',
                        p: { xs: 3.5, sm: 5 },
                        textAlign: 'center',
                        background:
                            'linear-gradient(160deg, rgba(224,201,122,0.22) 0%, rgba(255,255,255,0.9) 45%, rgba(201,168,76,0.16) 100%)',
                        border: '1px solid rgba(201,168,76,0.28)',
                        boxShadow: '0 8px 30px rgba(154,120,51,0.14), inset 0 1px 0 rgba(255,255,255,0.7)',
                    }}
                >
                    <Typography sx={{ color: palette.gold, fontWeight: 700, letterSpacing: '0.04em', mb: 1 }}>
                        💎 מחיר אחד. וזהו.
                    </Typography>

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                    >
                        <Typography
                            sx={{
                                fontFamily: "'Frank Ruhl Libre', serif",
                                fontWeight: 700,
                                fontSize: { xs: '3rem', sm: '3.6rem' },
                                color: palette.textDark,
                                lineHeight: 1,
                            }}
                        >
                            {import.meta.env.VITE_PRICING ?? 149} ₪
                        </Typography>
                    </motion.div>

                    <Typography sx={{ mt: 1, color: palette.textMuted, fontWeight: 600 }}>
                        לכל החתונה, מההתחלה ועד הסוף · כולל מע״מ
                    </Typography>

                    <Typography sx={{ mt: 1.5, color: palette.textDark, fontWeight: 700, fontSize: '0.95rem' }}>
                        בלי מנוי · בלי הפתעות · מחיר אחד לכל החתונה
                    </Typography>

                    <Box sx={{ my: 3, height: '1px', background: 'rgba(201,168,76,0.25)' }} />

                    <motion.div variants={staggerContainer} initial="hidden" whileInView="show" viewport={{ once: true }}>
                        <Box
                            sx={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: 1.4,
                                textAlign: 'right',
                            }}
                        >
                            {included.map((item) => (
                                <motion.div
                                    key={item}
                                    variants={fadeUp}
                                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                                >
                                    <CheckCircleIcon sx={{ color: palette.gold, fontSize: 17, flexShrink: 0 }} />
                                    <Typography sx={{ fontSize: '0.85rem', color: palette.textDark, textAlign: "start" }}>{item}</Typography>
                                </motion.div>
                            ))}
                        </Box>
                    </motion.div>

                    <Typography
                        sx={{
                            mt: 3.5,
                            fontFamily: "'Frank Ruhl Libre', serif",
                            fontWeight: 700,
                            fontSize: '1.1rem',
                            color: palette.textDark,
                        }}
                    >
                        במקום להתעסק בניהול החתונה — תתעסקו בליהנות ממנה ❤️
                    </Typography>
                </Box>
            </motion.div>
        </Box>
    );
}