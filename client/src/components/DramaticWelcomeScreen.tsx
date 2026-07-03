import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import FallingPetals from './FallingPetals';

interface Props {
  firstName: string;
  onComplete: () => void;
}

type Phase = 'enter' | 'exit';

export default function DramaticWelcomeScreen({ firstName, onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>('enter');

  useEffect(() => {
    const exitTimer = window.setTimeout(() => setPhase('exit'), 2800);
    const doneTimer = window.setTimeout(() => onComplete(), 5000);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
  }, [onComplete]);

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
        background:
          'radial-gradient(ellipse at 18% 22%, rgba(224,201,122,0.40) 0%, transparent 58%),' +
          'radial-gradient(ellipse at 82% 74%, rgba(201,168,76,0.30) 0%, transparent 55%),' +
          'linear-gradient(150deg, #FBF8F3 0%, #F5E8CC 46%, #FBF8F3 100%)',
      }}
    >
      <FallingPetals />

      <Box
        sx={{
          position: 'absolute',
          top: '-6%',
          left: '-8%',
          width: 280,
          height: 280,
          borderRadius: '50%',
          opacity: 0.36,
          filter: 'blur(8px)',
          background: 'radial-gradient(circle, rgba(201,168,76,0.85) 0%, rgba(201,168,76,0) 72%)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '-8%',
          right: '-6%',
          width: 320,
          height: 320,
          borderRadius: '50%',
          opacity: 0.26,
          filter: 'blur(10px)',
          background: 'radial-gradient(circle, rgba(224,201,122,0.85) 0%, rgba(224,201,122,0) 70%)',
          pointerEvents: 'none',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 22, scale: 0.97, filter: 'blur(6px)' }}
        animate={
          phase === 'exit'
            ? { opacity: 0, y: -24, scale: 1.03, filter: 'blur(2px)' }
            : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }
        }
        transition={{ duration: phase === 'exit' ? 2.2 : 1.35, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: 780, position: 'relative', zIndex: 1 }}
      >
        <Box
          sx={{
            py: { xs: 6, sm: 7 },
            px: { xs: 3, sm: 6 },
            textAlign: 'center',
            borderRadius: 4,
            border: '1px solid rgba(201,168,76,0.30)',
            boxShadow: '0 14px 46px rgba(44,24,16,0.15), inset 0 1px 0 rgba(255,255,255,0.75)',
            background:
              'linear-gradient(145deg, rgba(255,255,255,0.82) 0%, rgba(255,250,241,0.88) 44%, rgba(248,238,216,0.84) 100%)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          <motion.div
            animate={{ opacity: [0.72, 1, 0.72], scale: [1, 1.02, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Typography
              sx={{
                fontFamily: "'Frank Ruhl Libre', serif",
                fontSize: { xs: '2rem', sm: '2.7rem' },
                fontWeight: 700,
                color: '#2C1810',
                lineHeight: 1.2,
              }}
            >
              שלום {firstName}
            </Typography>
            <Typography
              sx={{
                mt: 1.4,
                fontFamily: "'Frank Ruhl Libre', serif",
                fontSize: { xs: '1.2rem', sm: '1.65rem' },
                fontWeight: 600,
                color: '#8A6A2B',
                letterSpacing: '0.02em',
              }}
            >
              ברוך/ה הבא/ה לחתונה שלנו
            </Typography>
            <Typography sx={{ mt: 1.6, color: '#A08070', fontSize: { xs: '0.98rem', sm: '1.06rem' }, fontWeight: 500 }}>
              אנחנו שמחים שהצטרפתם אלינו לרגעים היפים של הערב
            </Typography>
          </motion.div>
        </Box>
      </motion.div>
    </Box>
  );
}