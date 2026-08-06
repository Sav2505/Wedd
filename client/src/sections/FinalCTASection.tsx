import { Box, Typography, Button } from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { fadeUp, staggerContainer, scrollReveal, palette } from '../shared/animations';

export default function FinalCTASection() {
    const navigate = useNavigate();

    return (
        <Box sx={{ px: 2, py: { xs: 2, sm: 11 }, mb: 12, textAlign: 'center' }}>
            <motion.div {...scrollReveal} variants={staggerContainer} style={{ maxWidth: 480, margin: '0 auto' }}>
                <motion.div variants={fadeUp}>
                    <Typography sx={{ fontSize: '2.2rem', mb: 1.5 }}>💍</Typography>
                    <Typography
                        sx={{
                            fontFamily: "'Frank Ruhl Libre', serif",
                            fontWeight: 700,
                            fontSize: { xs: '1.6rem', sm: '2rem' },
                            color: palette.textDark,
                            lineHeight: 1.4,
                        }}
                    >
                        מוכנים לנהל את החתונה
                        <br />
                        בדרך הרבה יותר פשוטה?
                    </Typography>
                </motion.div>

                <motion.div variants={fadeUp}>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={() => navigate('/register')}
                        className="shimmer-btn"
                        sx={{
                            mt: 4,
                            height: 54,
                            px: 5,
                            fontSize: '1.05rem',
                            fontWeight: 700,
                            letterSpacing: '0.02em',
                        }}
                    >
                        אני גם רוצה מערכת כזאת 💍
                    </Button>
                </motion.div>
            </motion.div>
        </Box>
    );
}