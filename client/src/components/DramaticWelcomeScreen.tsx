import { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import FallingPetals from './FallingPetals';

interface Props {
  firstName: string;
  /** Set to true when the app data is ready — triggers the exit animation.
   *  Defaults to true (immediately ready) for backwards-compatible usage. */
  ready?: boolean;
  onComplete: () => void;
}

type Phase = 'enter' | 'exit';

export default function DramaticWelcomeScreen({ firstName, ready = true, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>('enter');
  const mountTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!ready) return;
    // Ensure the enter animation (~1.35s) has had time to complete before exiting.
    // If data loads slower than 1.4s, we exit immediately (no extra wait).
    const elapsed = Date.now() - mountTimeRef.current;
    const delay = Math.max(0, 2800 - elapsed);

    const exitTimer = window.setTimeout(() => setPhase('exit'), delay);
    const doneTimer = window.setTimeout(() => onComplete(), delay + 1200);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
  }, [ready, onComplete]);

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        color: 'var(--color-ivory)',
        background:
          'radial-gradient(ellipse at center, rgba(201,168,76,0.16) 0%, transparent 68%),' +
          'repeating-linear-gradient(115deg, rgba(255,255,255,0.012) 0px, rgba(255,255,255,0.012) 1px, transparent 1px, transparent 5px),' +
          'linear-gradient(145deg, #332D1B 0%, #5A4D2C 52%, #302A1A 100%)',
      }}
    >
      <FallingPetals />

      <Box
        sx={{
          position: 'absolute',
          inset: { xs: 12, sm: 22 },
          border: '1px solid rgba(201,168,76,0.3)',
          pointerEvents: 'none',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 7,
            border: '1px solid rgba(201,168,76,0.14)',
          },
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
        animate={
          phase === 'exit'
            ? { opacity: 0, y: -18, filter: 'blur(3px)' }
            : { opacity: 1, y: 0, filter: 'blur(0px)' }
        }
        transition={{ duration: phase === 'exit' ? 0.6 : 1.35, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: 760, position: 'relative', zIndex: 1 }}
      >
        <Box
          sx={{
            py: { xs: 5, sm: 7 },
            px: { xs: 2, sm: 5 },
            textAlign: 'center',
          }}
        >
          <Typography
            sx={{
              mb: { xs: 2, sm: 2.5 },
              color: 'var(--color-gold-light)',
              fontSize: { xs: '0.7rem', sm: '0.78rem' },
              fontWeight: 500,
              letterSpacing: '0.18em',
            }}
          >
            ✦ &nbsp;ערב של אהבה&nbsp; ✦
          </Typography>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.9, ease: 'easeOut' }}
          >
            <Typography
              sx={{
                fontFamily: "'Frank Ruhl Libre', serif",
                fontSize: { xs: '2.6rem', sm: '4rem' },
                fontWeight: 500,
                color: 'var(--color-ivory)',
                lineHeight: 1.12,
              }}
            >
              שלום {firstName}
            </Typography>

            <Typography
              sx={{
                fontFamily: "'Frank Ruhl Libre', serif",
                mt: { xs: 1, sm: 1.5 },
                fontSize: { xs: '1.35rem', sm: '1.8rem' },
                fontWeight: 400,
                color: 'var(--color-gold-light)',
              }}
            >
              ברוך/ה הבא/ה לחתונה שלנו
            </Typography>
          </motion.div>

          <Box
            sx={{
              width: { xs: 76, sm: 104 },
              height: '1px',
              mx: 'auto',
              my: { xs: 2.5, sm: 3 },
              background: 'linear-gradient(90deg, transparent, var(--color-gold), transparent)',
              position: 'relative',
              '&::after': {
                content: '"✦"',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                px: 1,
                color: 'var(--color-gold-light)',
                backgroundColor: '#453B23',
                fontSize: '0.8rem',
              },
            }}
          />

          <Typography sx={{ color: 'rgba(250,247,242,0.84)', fontSize: { xs: '0.98rem', sm: '1.08rem' }, fontWeight: 400 }}>
            אנחנו שמחים ונרגשים לחגוג איתך את היום המיוחד בחיינו
          </Typography>

          <Box sx={{ mt: { xs: 4, sm: 5 }, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.2 }}>
            <Box
              sx={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                bgcolor: 'var(--color-gold-light)',
                animation: 'welcomePulse 1.4s ease-in-out infinite',
                '@keyframes welcomePulse': {
                  '0%, 100%': { opacity: 0.45, transform: 'scale(0.8)' },
                  '50%': { opacity: 1, transform: 'scale(1.15)' },
                },
              }}
            />
            <Typography sx={{ color: 'rgba(224,201,122,0.82)', fontSize: { xs: '0.78rem', sm: '0.86rem' }, fontWeight: 400 }}>
              מיד תועבר/י לאפליקציה
            </Typography>
          </Box>
        </Box>
      </motion.div>
    </Box>
  );
}