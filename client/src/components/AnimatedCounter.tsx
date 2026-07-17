import { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { motion, useInView } from 'framer-motion';
import { palette } from '../shared/animations';

interface AnimatedCounterProps {
    value: number;
    prefix?: string;
    suffix?: string;
    label: string;
    duration?: number;
}

// Counts up from 0 to `value` once it scrolls into view. Used for the
// small stat tiles inside the dashboard mockup and the pricing block
// ("149 ₪", "3 תזכורות אוטומטיות", etc.).
export default function AnimatedCounter({
    value,
    prefix = '',
    suffix = '',
    label,
    duration = 1.4,
}: AnimatedCounterProps) {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, amount: 0.6 });
    const [display, setDisplay] = useState(0);

    useEffect(() => {
        if (!inView) return;
        let raf: number;
        const start = performance.now();
        const tick = (now: number) => {
            const progress = Math.min((now - start) / (duration * 1000), 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(eased * value));
            if (progress < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [inView, value, duration]);

    return (
        <Box ref={ref} sx={{ textAlign: 'center' }}>
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5 }}
            >
                <Typography
                    sx={{
                        fontFamily: "'Frank Ruhl Libre', serif",
                        fontWeight: 700,
                        fontSize: { xs: '1.4rem', sm: '1.7rem' },
                        color: palette.textDark,
                        lineHeight: 1.1,
                    }}
                >
                    {prefix}
                    {display}
                    {suffix}
                </Typography>
                <Typography
                    sx={{
                        mt: 0.3,
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: palette.textMuted,
                    }}
                >
                    {label}
                </Typography>
            </motion.div>
        </Box>
    );
}