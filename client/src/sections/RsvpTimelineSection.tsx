import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { fadeUp, fadeUpCard, staggerContainer, scrollReveal, palette } from '../shared/animations';

const steps = [
    { when: '30 יום לפני', text: 'אישור הגעה נשלח אוטומטית לכל האורחים בוואטסאפ' },
    { when: '14 ימים לפני', text: 'למי שטרם השיב, נשלח תזכורת' },
    { when: 'יום לפני', text: 'שליחת הפרטים המלאים של האירוע לכלל המוזמנים שאישרו הגעה' },
    { when: 'בזמן אמת', text: 'הנתונים, ההושבה והתקציב מתעדכנים לבד' },
];

export default function RsvpTimelineSection() {
    return (
        <Box
            sx={{
                px: 2,
                py: { xs: 7, sm: 10 },
                background: 'linear-gradient(180deg, transparent 0%, rgba(201,168,76,0.06) 50%, transparent 100%)',
            }}
        >
            <motion.div {...scrollReveal} variants={staggerContainer} style={{ maxWidth: 640, margin: '0 auto' }}>
                <motion.div variants={fadeUp}>
                    <Typography sx={{ color: palette.gold, fontWeight: 700, textAlign: 'center', letterSpacing: '0.04em', mb: 1 }}>
                        🤖 אישורי הגעה שעובדים בשבילכם
                    </Typography>
                    <Typography
                        align="center"
                        sx={{
                            fontFamily: "'Frank Ruhl Libre', serif",
                            fontWeight: 700,
                            fontSize: { xs: '1.5rem', sm: '1.9rem' },
                            color: palette.textDark,
                            mb: { xs: 5, sm: 6 },
                        }}
                    >
                        התהליך רץ לבד, ברקע
                    </Typography>
                </motion.div>

                <Box sx={{ position: 'relative', pr: { xs: 3, sm: 4 } }}>
                    {/* vertical line */}
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 8,
                            bottom: 8,
                            right: { xs: 9, sm: 11 },
                            width: '2px',
                            background: 'linear-gradient(180deg, #E0C97A, rgba(201,168,76,0.15))',
                        }}
                    />

                    {steps.map((step, i) => (
                        <motion.div key={step.when} variants={fadeUpCard} style={{ position: 'relative', marginBottom: i === steps.length - 1 ? 0 : 34 }}>
                            <Box
                                sx={{
                                    position: 'absolute',
                                    right: { xs: 0, sm: 2 },
                                    top: 4,
                                    width: 20,
                                    height: 20,
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #E0C97A, #9A7833)',
                                    boxShadow: '0 0 0 5px rgba(201,168,76,0.14)',
                                }}
                            />
                            <Box sx={{ pr: { xs: 4.5, sm: 5.5 } }}>
                                <Typography sx={{ color: palette.gold, fontWeight: 700, fontSize: '0.85rem', mb: 0.3 }}>
                                    {step.when}
                                </Typography>
                                <Typography sx={{ color: palette.textDark, fontSize: '1rem', lineHeight: 1.6 }}>
                                    {step.text}
                                </Typography>
                            </Box>
                        </motion.div>
                    ))}
                </Box>
            </motion.div>
        </Box>
    );
}