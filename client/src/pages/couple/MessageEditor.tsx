import { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, CircularProgress,
  Alert, Collapse,
} from '@mui/material';
import FavoriteIcon     from '@mui/icons-material/Favorite';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { motion }       from 'framer-motion';
import { getWeddingInfo, updateWeddingInfo } from '../../services/info.service';

// ─── Floating sparkle ────────────────────────────────────────

function Sparkle({ x, y, delay }: { x: string; y: string; delay: number }) {
  return (
    <motion.div
      style={{ position: 'absolute', left: x, top: y, pointerEvents: 'none' }}
      animate={{ opacity: [0, 1, 0], scale: [0.6, 1.2, 0.6], y: [-6, 6, -6] }}
      transition={{ duration: 3.2, repeat: Infinity, delay, ease: 'easeInOut' }}
    >
      <Typography sx={{ fontSize: '1.1rem', color: '#C9A84C' }}>✦</Typography>
    </motion.div>
  );
}

// ─── Preview card ─────────────────────────────────────────────

function PreviewCard({ message }: { message: string }) {
  if (!message.trim()) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Box
        sx={{
          position: 'relative',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.85), rgba(245,237,217,0.85))',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(201,168,76,0.3)',
          borderRadius: 4,
          px: 3,
          py: 2.5,
          mt: 2,
          overflow: 'hidden',
        }}
      >
        <Sparkle x="5%"  y="10%" delay={0}   />
        <Sparkle x="90%" y="15%" delay={1.1} />
        <Sparkle x="50%" y="5%"  delay={2.3} />

        <Typography
          sx={{
            fontFamily: "'Frank Ruhl Libre', serif",
            fontSize: '0.85rem',
            color: '#C9A84C',
            textAlign: 'center',
            mb: 1,
            letterSpacing: 2,
          }}
        >
          ✦ תצוגה מקדימה ✦
        </Typography>

        <Typography
          sx={{
            fontFamily: "'Heebo', sans-serif",
            fontSize: '1rem',
            lineHeight: 1.9,
            color: '#2C1810',
            textAlign: 'center',
            whiteSpace: 'pre-wrap',
          }}
        >
          {message}
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5 }}>
          <FavoriteIcon sx={{ color: '#C9A84C', fontSize: 16 }} />
        </Box>
      </Box>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────

export default function MessageEditor() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    getWeddingInfo()
      .then((d) => setMessage(d.message ?? ''))
      .catch(() => setError('שגיאה בטעינת ההודעה'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      await updateWeddingInfo({ message });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: '#C9A84C' }} />
      </Box>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <Box sx={{ px: 2, pt: 2, pb: 4, maxWidth: 560, mx: 'auto' }}>

        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <FavoriteIcon sx={{ color: '#C9A84C', fontSize: 32, mb: 0.5 }} />
          <Typography
            sx={{
              fontFamily: "'Frank Ruhl Libre', serif",
              fontSize: '1.3rem',
              fontWeight: 700,
              color: '#2C1810',
            }}
          >
            מאיתנו אליכם
          </Typography>
          <Typography variant="body2" sx={{ color: '#A08070', mt: 0.5 }}>
            כתבו הודעה אישית לאורחים שלכם
          </Typography>
        </Box>

        <Collapse in={success}>
          <Alert severity="success" sx={{ mb: 2 }}>ההודעה נשמרה בהצלחה ✓</Alert>
        </Collapse>
        <Collapse in={Boolean(error)}>
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        </Collapse>

        <TextField
          label="הודעה לאורחים"
          fullWidth
          multiline
          rows={7}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="כתבו כאן את ההודעה האישית שלכם לאורחים…"
          sx={{
            '& .MuiOutlinedInput-root': {
              background: 'rgba(255,255,255,0.75)',
              '&:hover fieldset': { borderColor: '#C9A84C' },
              '&.Mui-focused fieldset': { borderColor: '#9A7833' },
            },
            '& label.Mui-focused': { color: '#9A7833' },
          }}
        />

        <PreviewCard message={message} />

        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveOutlinedIcon />}
          sx={{
            mt: 3,
            background: 'linear-gradient(135deg, #C9A84C, #9A7833)',
            color: '#FAF7F2',
            fontWeight: 700,
            fontSize: '1rem',
            borderRadius: 50,
            py: 1.5,
            boxShadow: '0 4px 20px rgba(201,168,76,0.4)',
            '&:hover': { background: 'linear-gradient(135deg, #E0C97A, #C9A84C)' },
          }}
        >
          {saving ? 'שומר…' : 'שמור הודעה'}
        </Button>
      </Box>
    </motion.div>
  );
}
