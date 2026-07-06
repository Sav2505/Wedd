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
    const doneTimer = window.setTimeout(() => onComplete(), 4600);

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

      {/* Ambient glow orbs */}
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
      <Box
        sx={{
          position: 'absolute',
          top: '30%',
          right: '-5%',
          width: 200,
          height: 200,
          borderRadius: '50%',
          opacity: 0.22,
          filter: 'blur(12px)',
          background: 'radial-gradient(circle, rgba(255,182,193,0.9) 0%, rgba(255,182,193,0) 70%)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '20%',
          left: '-4%',
          width: 180,
          height: 180,
          borderRadius: '50%',
          opacity: 0.20,
          filter: 'blur(10px)',
          background: 'radial-gradient(circle, rgba(201,168,76,0.9) 0%, rgba(201,168,76,0) 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Floating sparkle stars */}
      {([
        { left: '8%',  top: '12%', size: '1.3rem', dur: 2.8, delay: 0 },
        { left: '88%', top: '8%',  size: '1.0rem', dur: 3.2, delay: 0.7 },
        { left: '5%',  top: '55%', size: '0.9rem', dur: 2.5, delay: 1.2 },
        { left: '93%', top: '50%', size: '1.1rem', dur: 3.6, delay: 0.3 },
        { left: '15%', top: '82%', size: '1.0rem', dur: 2.9, delay: 1.8 },
        { left: '80%', top: '78%', size: '1.2rem', dur: 3.1, delay: 0.9 },
        { left: '50%', top: '6%',  size: '0.8rem', dur: 2.4, delay: 0.5 },
        { left: '45%', top: '90%', size: '1.0rem', dur: 3.4, delay: 1.4 },
        { left: '30%', top: '18%', size: '0.75rem',dur: 2.6, delay: 2.0 },
        { left: '70%', top: '22%', size: '0.85rem',dur: 3.0, delay: 0.2 },
      ] as const).map((s, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            left: s.left,
            top: s.top,
            fontSize: s.size,
            color: i % 3 === 0 ? '#C9A84C' : i % 3 === 1 ? '#E8C97A' : '#D4AF6A',
            pointerEvents: 'none',
            zIndex: 0,
            userSelect: 'none',
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.4, 1.3, 0.4],
            y: [0, -10, 0],
          }}
          transition={{
            duration: s.dur,
            delay: s.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {i % 4 === 0 ? '✦' : i % 4 === 1 ? '★' : i % 4 === 2 ? '✿' : '✦'}
        </motion.div>
      ))}

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
            {/* Decorative rings header */}
            <Typography sx={{ fontSize: { xs: '1.6rem', sm: '2rem' }, lineHeight: 1, mb: 1, userSelect: 'none' }}>
              💍&nbsp;✦&nbsp;💍
            </Typography>

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

            {/* Golden divider */}
            <Box sx={{ display: 'flex', alignItems: 'center', mx: { xs: 2, sm: 6 }, my: 1.2 }}>
              <Box sx={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.7))' }} />
              <Typography sx={{ mx: 1.2, color: '#C9A84C', fontSize: '1rem', lineHeight: 1, userSelect: 'none' }}>✦</Typography>
              <Box sx={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, rgba(201,168,76,0.7))' }} />
            </Box>

            <Typography
              sx={{
                fontFamily: "'Frank Ruhl Libre', serif",
                fontSize: { xs: '1.2rem', sm: '1.65rem' },
                fontWeight: 600,
                color: '#8A6A2B',
                letterSpacing: '0.02em',
              }}
            >
              ברוך/ה הבא/ה לחתונה שלנו
            </Typography>

            {/* Golden divider */}
            <Box sx={{ display: 'flex', alignItems: 'center', mx: { xs: 2, sm: 6 }, my: 1.2 }}>
              <Box sx={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.5))' }} />
              <Typography sx={{ mx: 1.2, color: '#C9A84C', fontSize: '0.85rem', lineHeight: 1, userSelect: 'none' }}>✿</Typography>
              <Box sx={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, rgba(201,168,76,0.5))' }} />
            </Box>

            <Typography sx={{ mt: 0.4, color: '#A08070', fontSize: { xs: '0.98rem', sm: '1.06rem' }, fontWeight: 500 }}>
              אנחנו שמחים ונרגשים לחגוג איתך את היום המיוחד בחיינו! ✨
            </Typography>

            <Typography sx={{ mt: 0.4, color: '#A08070', fontSize: { xs: '0.68rem', sm: '0.86rem' }, fontWeight: 400 }}>
              מיד תועבר/י לאפליקציה...
            </Typography>

            {/* Decorative hearts footer */}
            <Typography sx={{ mt: 1.4, fontSize: { xs: '1.1rem', sm: '1.3rem' }, lineHeight: 1, userSelect: 'none' }}>
              🌸&nbsp;♡&nbsp;🌸
            </Typography>
          </motion.div>
        </Box>
      </motion.div>
    </Box>
  );
}