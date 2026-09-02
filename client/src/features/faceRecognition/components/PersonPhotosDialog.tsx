import { Box, Dialog, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { Photo } from '../../../types/domain';
import type { PersonCluster } from '../types/faceRecognition.types';

interface PersonPhotosDialogProps {
  open: boolean;
  person: PersonCluster | null;
  photosById: Map<string, Photo>;
  onClose: () => void;
  onOpenPhoto: (photo: Photo) => void;
}

const API_BASE = import.meta.env.VITE_API_URL ?? '';

function srcFor(url: string | null): string {
  if (!url) {
    return '';
  }
  if (url.startsWith('/photos/')) {
    return `${API_BASE}${url}`;
  }
  return url;
}

export default function PersonPhotosDialog({
  open,
  person,
  photosById,
  onClose,
  onOpenPhoto,
}: PersonPhotosDialogProps) {
  const personPhotos = person
    ? person.photoIds
      .map((photoId) => photosById.get(photoId))
      .filter((photo): photo is Photo => Boolean(photo))
    : [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden' } }}
    >
      <DialogTitle sx={{
        fontFamily: "'Frank Ruhl Libre', serif",
        fontWeight: 700,
        color: '#2C1810',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span>נמצאו {personPhotos.length} תמונות</span>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ background: '#FAF7F2' }}>
        {personPhotos.length === 0 ? (
          <Typography sx={{ color: '#7A5C3A' }}>אין כרגע תמונות להצגה.</Typography>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 1.2,
            }}
          >
            {personPhotos.map((photo) => (
              <Box
                key={photo.id}
                onClick={() => onOpenPhoto(photo)}
                sx={{
                  borderRadius: 2,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: '1px solid rgba(201,168,76,0.22)',
                  background: '#fff',
                }}
              >
                <Box
                  component="img"
                  src={srcFor(photo.url)}
                  alt={photo.caption ?? 'תמונה מהגלריה'}
                  sx={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
                />
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
