import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { fadeUp, fadeUpCard, staggerContainer, scrollReveal, palette } from '../shared/animations';
import MockupFrame from '../components/MockupFrame';
import AnimatedCounter from '../components/AnimatedCounter';

const features = [
    'ניהול משימות אישי לחתן ולכלה',
    'אפשרות לבצע אישורי הגעה אוטומטיים מהמערכת - כלול במחיר',
    'מעקב הוצאות והכנסות בזמן אמת',
    'רשימת מוזמנים חכמה ומסודרת',
    'גלריה משותפת לכלל המוזמנים שתישאר איתכם כמזכרת יפה מהאירוע',
    'ייבוא וייצוא מוזמנים לאקסל בלחיצה אחת',
    'סידורי הושבה עם אפשרות שיקוף לאורחים',
];

function DashboardMockup() {
    return (
        <MockupFrame label="לוח הבקרה שלכם">
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.4, mb: 2 }}>
                <Box
                    sx={{
                        p: 1.6,
                        borderRadius: '14px',
                        background: 'rgba(201,168,76,0.08)',
                        border: '1px solid rgba(201,168,76,0.16)',
                    }}
                >
                    <AnimatedCounter value={126} label="אורחים אישרו" />
                </Box>
                <Box
                    sx={{
                        p: 1.6,
                        borderRadius: '14px',
                        background: 'rgba(201,168,76,0.08)',
                        border: '1px solid rgba(201,168,76,0.16)',
                    }}
                >
                    <AnimatedCounter value={18} label="שולחנות נקבעו" />
                </Box>
                <Box
                    sx={{
                        p: 1.6,
                        borderRadius: '14px',
                        background: 'rgba(201,168,76,0.08)',
                        border: '1px solid rgba(201,168,76,0.16)',
                    }}
                >
                    <AnimatedCounter value={82} suffix="%" label="משימות הושלמו" />
                </Box>
            </Box>

            {/* Fake progress rows, styled — not screenshots */}
            {[
                { label: 'שולם עד כה', pct: 64 },
                { label: 'אישורי הגעה', pct: 88 },
                { label: 'הזמנות שנשלחו', pct: 100 },
            ].map((row) => (
                <Box key={row.label} sx={{ mb: 1.4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ fontSize: '0.78rem', color: palette.textMuted, fontWeight: 600 }}>
                            {row.label}
                        </Typography>
                        <Typography sx={{ fontSize: '0.78rem', color: palette.gold, fontWeight: 700 }}>
                            {row.pct}%
                        </Typography>
                    </Box>
                    <Box sx={{ height: 6, borderRadius: 3, background: 'rgba(201,168,76,0.14)', overflow: 'hidden' }}>
                        <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${row.pct}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 1.1, ease: 'easeOut' }}
                            style={{
                                height: '100%',
                                borderRadius: 3,
                                background: 'linear-gradient(90deg, #E0C97A, #9A7833)',
                            }}
                        />
                    </Box>
                </Box>
            ))}
        </MockupFrame>
    );
}

export default function CoupleDashboardSection() {
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
                <motion.div {...scrollReveal} variants={fadeUpCard} style={{ order: 1 }}>
                    <DashboardMockup />
                </motion.div>

                <motion.div {...scrollReveal} variants={staggerContainer} style={{ order: 2 }}>
                    <motion.div variants={fadeUp}>
                        <Typography sx={{ color: palette.gold, fontWeight: 700, letterSpacing: '0.04em', mb: 1 }}>
                            👰 לזוג המתחתן
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
                            כל מה שצריך כדי לנהל חתונה
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
                            אין צורך לעבור בין כמה מערכות, קבצי אקסל וקבוצות ווטסאפ —
                            כל תהליך ארגון החתונה מתבצע מתוך מערכת אחת, פשוטה ונוחה.
                        </Typography>
                    </motion.div>
                </motion.div>
            </Box>
        </Box>
    );
}