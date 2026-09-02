import { Box, LinearProgress, Typography } from '@mui/material';
import { FACE_SCAN_STAGE_LABELS } from '../config';
import type { FaceScanProgress as FaceScanProgressType } from '../types/faceRecognition.types';

interface FaceScanProgressProps {
  progress: FaceScanProgressType;
}

export default function FaceScanProgress({ progress }: FaceScanProgressProps) {
  return (
    <Box
      sx={{
        mt: 2,
        p: 2,
        borderRadius: 3,
        border: '1px solid rgba(201,168,76,0.25)',
        background: 'rgba(255,255,255,0.72)',
      }}
    >
      <Typography sx={{ fontWeight: 700, color: '#5C3D2E', mb: 1 }}>
        {FACE_SCAN_STAGE_LABELS[progress.stage]}
      </Typography>

      <LinearProgress
        variant="determinate"
        value={Math.max(0, Math.min(progress.percentage, 100))}
        sx={{
          height: 10,
          borderRadius: 99,
          backgroundColor: 'rgba(201,168,76,0.16)',
          '& .MuiLinearProgress-bar': {
            borderRadius: 99,
            background: 'linear-gradient(135deg, #E0C97A, #C9A84C)',
          },
        }}
      />

      <Box sx={{ mt: 1.2, display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="caption" sx={{ color: '#7A5C3A' }}>
          {progress.processed} / {progress.total}
        </Typography>
        <Typography variant="caption" sx={{ color: '#7A5C3A' }}>
          {progress.percentage}%
        </Typography>
        <Typography variant="caption" sx={{ color: '#7A5C3A' }}>
          פנים: {progress.facesFound}
        </Typography>
        <Typography variant="caption" sx={{ color: '#7A5C3A' }}>
          שגיאות: {progress.errorsCount}
        </Typography>
      </Box>

      {progress.message && (
        <Typography variant="caption" sx={{ mt: 0.7, display: 'block', color: '#A08070' }}>
          {progress.message}
        </Typography>
      )}
    </Box>
  );
}
