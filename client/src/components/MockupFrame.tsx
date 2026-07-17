import { Box } from '@mui/material';
import { motion } from 'framer-motion';
import { palette } from '../shared/animations';

interface MockupFrameProps {
    children: React.ReactNode;
    label?: string;
    maxWidth?: number;
    floating?: boolean;
}

// A styled "device chrome" wrapper that makes any content inside it
// read as a real screen from the app, rather than a plain list.
// Used to give the showcase page a "tour of the product" feel
// instead of a static feature list.
export default function MockupFrame({
    children,
    label,
    maxWidth = 380,
    floating = true,
}: MockupFrameProps) {
    const inner = (
        <Box
            sx={{
                mx: 'auto',
                maxWidth,
                borderRadius: '22px',
                overflow: 'hidden',
                background: 'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: `1px solid rgba(201,168,76,0.22)`,
                boxShadow:
                    '0 4px 20px rgba(44,24,16,0.08), 0 24px 60px rgba(44,24,16,0.14)',
            }}
        >
            {/* Chrome bar */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.8,
                    px: 2,
                    py: 1.2,
                    borderBottom: `1px solid rgba(201,168,76,0.16)`,
                    background:
                        'linear-gradient(180deg, rgba(245,237,217,0.7) 0%, rgba(255,255,255,0.4) 100%)',
                }}
            >
                <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: 'rgba(201,168,76,0.35)' }} />
                <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: 'rgba(201,168,76,0.35)' }} />
                <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: 'rgba(201,168,76,0.35)' }} />
                {label && (
                    <Box
                        sx={{
                            mr: 'auto',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            color: palette.textMuted,
                            letterSpacing: '0.02em',
                        }}
                    >
                        {label}
                    </Box>
                )}
            </Box>

            {/* Screen content */}
            <Box sx={{ p: { xs: 2, sm: 2.5 } }}>{children}</Box>
        </Box>
    );

    if (!floating) return inner;

    return (
        <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        >
            {inner}
        </motion.div>
    );
}