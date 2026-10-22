import { Box } from '@mui/material';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import MapIcon from '@mui/icons-material/Map';
import { motion } from 'framer-motion';
import type { WeddingInfo } from '../types/domain';

export default function MapButtons({ info }: { info: WeddingInfo }) {
  const encoded = encodeURIComponent(info.venue_address);
  const wazeUrl = info.venue_lat && info.venue_lng
    ? `https://waze.com/ul?ll=${info.venue_lat},${info.venue_lng}&navigate=yes`
    : `https://waze.com/ul?q=${encoded}&navigate=yes`;
  const googleUrl = info.venue_lat && info.venue_lng
    ? `https://maps.google.com/?q=${info.venue_lat},${info.venue_lng}`
    : `https://maps.google.com/?q=${encoded}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4, ease: 'easeOut' }}
    >
      <Box sx={{ display: 'flex', gap: 1.5, mt: 1, flexWrap: 'wrap' }}>
        <Box
          component="a"
          href={wazeUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            flex: 1,
            minWidth: 130,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            py: 1.25,
            px: 2,
            borderRadius: 50,
            background: 'linear-gradient(135deg, #E0C97A, #C9A84C)',
            color: '#fff',
            fontFamily: "'Heebo', sans-serif",
            fontWeight: 600,
            fontSize: '0.87rem',
            textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(201,168,76,0.35)',
            transition: 'all 0.22s ease',
            '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 18px rgba(201,168,76,0.45)' },
          }}
        >
          <DirectionsCarIcon sx={{ fontSize: 18 }} />
          ניווט בWaze
        </Box>
        <Box
          component="a"
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            flex: 1,
            minWidth: 130,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            py: 1.25,
            px: 2,
            borderRadius: 50,
            border: '1.5px solid rgba(201,168,76,0.55)',
            color: '#9A7833',
            fontFamily: "'Heebo', sans-serif",
            fontWeight: 600,
            fontSize: '0.87rem',
            textDecoration: 'none',
            background: 'rgba(255,255,255,0.7)',
            transition: 'all 0.22s ease',
            '&:hover': { transform: 'translateY(-2px)', background: 'rgba(201,168,76,0.08)' },
          }}
        >
          <MapIcon sx={{ fontSize: 18 }} />
          Google Maps
        </Box>
      </Box>
    </motion.div>
  );
}