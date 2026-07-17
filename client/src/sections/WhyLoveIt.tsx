import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { fadeUpCard, staggerContainer, scrollReveal, palette } from '../shared/animations';

const items = [
    {
        emoji: '🗂',
        title: 'הכל במקום אחד',
        text: 'בלי לקפוץ בין קבצי אקסל, קבוצות ווטסאפ ועשרות אפליקציות. כל מה שקשור לחתונה נמצא במסך אחד.',
    },
    {
        emoji: '❤️',
        title: 'חוויית אורחים יוצאת דופן',
        text: 'האורחים שלכם נהנים מחוויה אישית, נוחה ומרשימה – עם אישור הגעה דיגיטלי, צפייה במיקום הישיבה, ניווט לאולם, הוספת האירוע ליומן בלחיצה אחת וגלריה משותפת שבה כל האורחים יכולים להעלות ולשתף תמונות מהאירוע. וכל זה בלי שתצטרכו להרים טלפון אחד או לשלם על כל הודעה שנשלחת לאורח.',
    },
    {
        emoji: '💎',
        title: 'מחיר שלא קיים היום',
        text: 'אנחנו יודעים שחתונה זו הוצאה גדולה.. מטרתינו היא להקל עליכם ולתת לכם כלי איכותי ומתקדם הכולל בתוכו את כל מה שאתם צריכים לארגון החתונה, במחיר סמלי של 149 ש"ח בלבד !',
    },
    {
        emoji: '⏰',
        title: 'חוסך שעות של עבודה',
        text: 'המערכת שלנו היא המתקדמת ביותר היום, הכל מחושב באופן אוטומטי בהתאם לצרכי הזוג, כך שתוכלו להתרכז במה שחשוב באמת - ההכנות לחתונה.',
    },
    {
        emoji: '💰',
        title: 'שקיפות מלאה בתקציב',
        text: 'מעקב מדויק אחר הוצאות והכנסות מהאירוע, כדי שתדעו בכל רגע נתון בדיוק איפה אתם עומדים.',
    },
];

export default function WhyLoveIt() {
    return (
        <Box id="showcase-why" sx={{ px: 2, py: { xs: 7, sm: 10 } }}>
            <motion.div {...scrollReveal} variants={staggerContainer}>
                <motion.div variants={fadeUpCard}>
                    <Typography
                        align="center"
                        sx={{
                            fontFamily: "'Frank Ruhl Libre', serif",
                            fontWeight: 700,
                            fontSize: { xs: '1.7rem', sm: '2.1rem' },
                            color: palette.textDark,
                            mb: { xs: 5, sm: 7 },
                        }}
                    >
                        למה זוגות אוהבים את המערכת ? 👰
                    </Typography>
                </motion.div>

                <Box
                    sx={{
                        maxWidth: 1000,
                        mx: 'auto',
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                        gap: 2.5,
                    }}
                >
                    {items.map((item) => (
                        <motion.div key={item.title} variants={fadeUpCard} whileHover={{ y: -4 }}>
                            <Box
                                sx={{
                                    height: '100%',
                                    p: 3,
                                    borderRadius: '22px',
                                    background: 'rgba(255,255,255,0.82)',
                                    backdropFilter: 'blur(16px)',
                                    WebkitBackdropFilter: 'blur(16px)',
                                    border: '1px solid rgba(201,168,76,0.2)',
                                    boxShadow: '0 4px 20px rgba(44,24,16,0.06)',
                                    transition: '.25s',
                                    '&:hover': {
                                        boxShadow: '0 12px 32px rgba(154,120,51,0.16)',
                                        borderColor: 'rgba(201,168,76,0.4)',
                                    },
                                }}
                            >
                                <Typography sx={{ fontSize: '2rem', mb: 0.3 }}>{item.emoji}</Typography>
                                <Typography
                                    sx={{
                                        fontFamily: "'Frank Ruhl Libre', serif",
                                        fontWeight: 800,
                                        fontSize: '1.45rem',
                                        color: palette.textDark,
                                        mb: 0.9,
                                    }}
                                >
                                    {item.title}
                                </Typography>
                                <Typography sx={{ color: palette.textMuted, fontSize: '0.92rem', lineHeight: 1.75 }}>
                                    {item.text}
                                </Typography>
                            </Box>
                        </motion.div>
                    ))}
                </Box>
            </motion.div>
        </Box>
    );
}