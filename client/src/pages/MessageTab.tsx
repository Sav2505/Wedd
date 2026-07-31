import { Box, Typography, Skeleton } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { motion } from 'framer-motion';
import { useTypewriter } from '../hooks/useTypewriter';
import { useWeddingInfo } from '../hooks/useWeddingInfo';

// ─── Floating sparkle decoration ────────────────────────────

function Sparkle({
  top, left, right, bottom, size = 18, delay = 0,
}: {
  top?: string; left?: string; right?: string; bottom?: string;
  size?: number; delay?: number;
}) {
  return (
    <motion.div
      style={{ position: 'absolute', top, left, right, bottom, pointerEvents: 'none' }}
      animate={{ y: [0, -8, 0], opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 3.5 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      <AutoAwesomeIcon sx={{ fontSize: size, color: 'rgba(201,168,76,0.55)' }} />
    </motion.div>
  );
}

// ─── Main ───────────────────────────────────────────────────

export default function MessageTab() {
  const { info, loading, error } = useWeddingInfo();
  const fallback =
    'אתם המשפחה והחברים הקרובים שלנו, ואנו כל כך שמחים לחגוג איתכם את היום המיוחד הזה. תודה שאתם כאן, ושאתם חלק מהסיפור שלנו. ❤️';

  const rawMessage =
    !error && info?.message
      ? info.message
      : fallback;

  const typed = useTypewriter(loading ? '' : rawMessage, 24, 800);
  const isTyping = !loading && typed.length < rawMessage.length;
  const brideAndGroom =
    info ? `${info.groom_name} & ${info.bride_name}` : '';

  return (
    <Box
      sx={{
        p: { xs: 3, sm: 4 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: 380,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(201,168,76,0.08) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      {/* Sparkles */}
      <Sparkle top="10%" left="8%" size={16} delay={0} />
      <Sparkle top="15%" right="10%" size={12} delay={1.2} />
      <Sparkle bottom="20%" left="12%" size={14} delay={0.7} />
      <Sparkle bottom="15%" right="8%" size={18} delay={1.8} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: 520, textAlign: 'center', zIndex: 1 }}
      >
        {/* Heart icon */}
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ display: 'inline-block', marginBottom: 16 }}
        >
          <FavoriteIcon
            sx={{
              fontSize: 48,
              background: 'linear-gradient(135deg, #E0C97A, #C9A84C)',
              WebkitBackgroundClip: 'text',
              color: '#C9A84C !important',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 3px 8px rgba(201,168,76,0.4))',
            }}
          />
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <Typography
            variant="h5"
            sx={{
              fontFamily: "'Frank Ruhl Libre', serif",
              fontWeight: 700,
              color: '#2C1810',
              mb: 0.5,
            }}
          >
            הקדשה מאיתנו
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, mb: 3 }}>
            <Box sx={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.25)', maxWidth: 80 }} />
            <Typography sx={{ color: '#C9A84C', fontSize: '0.85rem' }}>✦</Typography>
            <Box sx={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.25)', maxWidth: 80 }} />
          </Box>
        </motion.div>

        {/* Message body */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.65, ease: 'easeOut' }}
        >
          <Box
            sx={{
              background: 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(201,168,76,0.2)',
              borderRadius: 4,
              p: { xs: 3, sm: 4 },
              mb: 3,
              position: 'relative',
              '&::before': {
                content: '"\u201C"',
                position: 'absolute',
                top: 12,
                right: 20,
                fontSize: '4rem',
                lineHeight: 1,
                color: 'rgba(201,168,76,0.2)',
                fontFamily: "'Frank Ruhl Libre', serif",
              },
            }}
          >
            {loading ? (
              <>
                <Skeleton width="90%" sx={{ mb: 1 }} />
                <Skeleton width="85%" sx={{ mb: 1 }} />
                <Skeleton width="70%" />
              </>
            ) : (
              <Typography
                variant="body1"
                sx={{
                  fontFamily: "'Frank Ruhl Libre', serif",
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                  lineHeight: 2,
                  color: '#2C1810',
                  whiteSpace: 'pre-line',
                  minHeight: '4em',
                }}
              >
                {typed}
                {isTyping && (
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.7, repeat: Infinity }}
                    style={{ display: 'inline-block', marginRight: 1, color: '#C9A84C', fontWeight: 700 }}
                  >
                    |
                  </motion.span>
                )}
              </Typography>
            )}
          </Box>
        </motion.div>

        {/* Signature */}
        {!loading && brideAndGroom && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <Typography
              sx={{
                fontFamily: "'Frank Ruhl Libre', serif",
                fontSize: '1.32rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #C9A84C, #9A7833)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              — {brideAndGroom} 💍
            </Typography>
          </motion.div>
        )}
      </motion.div>
    </Box>
  );
}
