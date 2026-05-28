import React from 'react';
import { Box, SxProps, Theme } from '@mui/material';
import { motion } from 'framer-motion';

interface GoldCardProps {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
  delay?: number;
  noPad?: boolean;
}

export default function GoldCard({ children, sx, delay = 0, noPad = false }: GoldCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    >
      <Box
        sx={{
          background: 'rgba(255,255,255,0.78)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderRadius: '20px',
          border: '1px solid rgba(201,168,76,0.22)',
          boxShadow:
            '0 2px 16px rgba(44,24,16,0.06), 0 8px 32px rgba(44,24,16,0.07)',
          overflow: 'hidden',
          p: noPad ? 0 : { xs: 2.5, sm: 3 },
          transition: 'box-shadow 0.25s ease, transform 0.25s ease',
          '&:hover': {
            boxShadow: '0 4px 24px rgba(44,24,16,0.09), 0 12px 40px rgba(44,24,16,0.09)',
          },
          ...sx,
        }}
      >
        {children}
      </Box>
    </motion.div>
  );
}
