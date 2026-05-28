import { useMemo } from 'react';
import { Box } from '@mui/material';

interface Petal {
  id: number;
  left: string;
  size: number;
  duration: number;
  delay: number;
  rotate: number;
  opacity: number;
}

function PetalSvg({ size, rotate }: { size: number; rotate: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <ellipse
        cx="12"
        cy="12"
        rx="5"
        ry="10"
        fill="rgba(201,168,76,0.45)"
        transform="rotate(-30 12 12)"
      />
    </svg>
  );
}

const COUNT = 14;

export default function FallingPetals() {
  const petals = useMemo<Petal[]>(() => {
    return Array.from({ length: COUNT }, (_, i) => ({
      id:       i,
      left:     `${(i * (100 / COUNT) + Math.sin(i) * 6).toFixed(1)}%`,
      size:     10 + (i % 3) * 6,
      duration: 7 + (i % 5) * 1.4,
      delay:    (i * 0.6) % 8,
      rotate:   i * 25,
      opacity:  0.45 + (i % 4) * 0.1,
    }));
  }, []);

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0,
      }}
      aria-hidden="true"
    >
      {petals.map((p) => (
        <Box
          key={p.id}
          sx={{
            position: 'absolute',
            top: '-40px',
            left: p.left,
            opacity: p.opacity,
            animation: `petalFall ${p.duration}s ${p.delay}s ease-in infinite`,
            willChange: 'transform',
          }}
        >
          <PetalSvg size={p.size} rotate={p.rotate} />
        </Box>
      ))}
    </Box>
  );
}
