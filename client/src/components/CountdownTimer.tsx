import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calcTimeLeft(targetDate: string): TimeLeft {
  const diff = new Date(targetDate + 'T00:00:00').getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days:    Math.floor(diff / 86_400_000),
    hours:   Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000)    / 1_000),
  };
}

function UnitBox({ value, label }: { value: number; label: string }) {
  return (
    <motion.div
      key={value}
      initial={{ opacity: 0.4, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minWidth: 56,
        }}
      >
        <Box
          sx={{
            background: 'linear-gradient(160deg, rgba(224,201,122,0.22), rgba(201,168,76,0.13))',
            border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: '14px',
            width: 56,
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 0.5,
          }}
        >
          <Typography
            sx={{
              fontSize: '1.6rem',
              fontWeight: 700,
              fontFamily: "'Frank Ruhl Libre', serif",
              color: '#9A7833',
              lineHeight: 1,
            }}
          >
            {String(value).padStart(2, '0')}
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: '#A08070', fontWeight: 500, fontSize: '0.68rem' }}>
          {label}
        </Typography>
      </Box>
    </motion.div>
  );
}

function Separator() {
  return (
    <Typography
      sx={{
        fontSize: '1.4rem',
        color: 'rgba(201,168,76,0.55)',
        fontWeight: 700,
        lineHeight: 1,
        mt: '-12px',
        mx: 0,
      }}
    >
      :
    </Typography>
  );
}

interface Props {
  weddingDate: string; // ISO "2026-07-15"
}

export default function CountdownTimer({ weddingDate }: Props) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calcTimeLeft(weddingDate));

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(calcTimeLeft(weddingDate)), 1000);
    return () => clearInterval(id);
  }, [weddingDate]);

  const isPast = Object.values(timeLeft).every((v) => v === 0);

  return (
    <Box sx={{ mt: 3 }}>
      <Typography
        variant="body2"
        sx={{ color: '#A08070', mb: 1.5, textAlign: 'center', fontWeight: 500 }}
      >
        {isPast ? '🎉 החתונה כבר הגיעה!' : '⏳ נותרו עד החתונה'}
      </Typography>
      {!isPast && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: { xs: 0.75, sm: 1.5 },
            flexWrap: 'wrap',
          }}
        >
          <UnitBox value={timeLeft.seconds} label="שניות" />
          <Separator />
          <UnitBox value={timeLeft.minutes} label="דקות" />
          <Separator />
          <UnitBox value={timeLeft.hours}   label="שעות" />
          <Separator />
          <UnitBox value={timeLeft.days}    label="ימים" />
        </Box>
      )}
    </Box>
  );
}
