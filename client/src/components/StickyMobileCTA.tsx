import { useEffect, useState } from 'react';
import { Box, Button } from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// Fixed CTA bar that fades in on mobile once the user scrolls past
// the hero section, so the main action is always one tap away.
export default function StickyMobileCTA() {
    const navigate = useNavigate();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const onScroll = () => setVisible(window.scrollY > 480);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ y: 90, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 90, opacity: 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    style={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        zIndex: 30,
                    }}
                >
                    <Box
                        sx={{
                            display: { xs: 'block', sm: 'none' },
                            px: 2,
                            py: 1.5,
                            background: 'rgba(250,247,242,0.92)',
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            borderTop: `1px solid rgba(201,168,76,0.25)`,
                            boxShadow: '0 -8px 24px rgba(44,24,16,0.10)',
                        }}
                    >
                        <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            onClick={() => navigate('/register')}
                            className="shimmer-btn"
                            sx={{
                                height: 48,
                                fontSize: '0.98rem',
                                fontWeight: 700,
                                letterSpacing: '0.02em',
                            }}
                        >
                            אני רוצה גם מערכת כזאת 💍
                        </Button>
                    </Box>
                </motion.div>
            )}
        </AnimatePresence>
    );
}