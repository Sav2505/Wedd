import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box, Typography, IconButton, CircularProgress,
  Dialog, DialogContent, Skeleton, Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { motion, AnimatePresence } from 'framer-motion';
import { getPhotos, uploadPhoto, deletePhoto } from '../services/photos.service';
import { Photo } from '../types/domain';
import { useAppSelector } from '../store';

// ─── Drop zone ───────────────────────────────────────────────

function DropZone({ onFileSelect }: { onFileSelect: (file: File) => void }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = 'image/jpeg,image/png,image/webp,image/gif';

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && accept.includes(file.type)) onFileSelect(file);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
          e.target.value = '';
        }}
      />
      <motion.div
        animate={{ scale: dragOver ? 1.02 : 1 }}
        transition={{ duration: 0.18 }}
      >
        <Box
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          sx={{
            border: `2px dashed ${dragOver ? '#C9A84C' : 'rgba(201,168,76,0.35)'}`,
            borderRadius: 4,
            p: 3,
            mb: 2.5,
            textAlign: 'center',
            cursor: 'pointer',
            background: dragOver
              ? 'rgba(201,168,76,0.08)'
              : 'rgba(255,255,255,0.4)',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: '#C9A84C',
              background: 'rgba(201,168,76,0.05)',
            },
          }}
        >
          <motion.div
            animate={{ y: dragOver ? -4 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <CloudUploadIcon sx={{ fontSize: 32, color: dragOver ? '#C9A84C' : '#C0A090', mb: 0.5 }} />
          </motion.div>
          <Typography variant="body2" sx={{ color: dragOver ? '#9A7833' : '#A08070', fontWeight: 500 }}>
            {dragOver ? 'שחרר כאן להעלאה' : 'גרור תמונה לכאן, או לחץ להעלאה'}
          </Typography>
          <Typography variant="caption" sx={{ color: '#C0A090' }}>
            JPEG • PNG • WEBP • GIF — עד 10MB
          </Typography>
        </Box>
      </motion.div>
    </>
  );
}

// ─── Photo card ──────────────────────────────────────────────

function PhotoCard({
  photo, guestId, onDelete, onOpen,
}: {
  photo: Photo;
  guestId: string;
  onDelete: (id: string) => void;
  onOpen: (photo: Photo) => void;
}) {
  const isOwner = photo.uploader_id === guestId;
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('למחוק את התמונה?')) return;
    setDeleting(true);
    try {
      await deletePhoto(photo.id, guestId);
      onDelete(photo.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.88 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', cursor: 'pointer' }}
      onClick={() => onOpen(photo)}
    >
      <Box
        component="img"
        src={photo.url}
        alt={photo.caption ?? 'תמונה מהחתונה'}
        loading="lazy"
        sx={{
          width: '100%',
          aspectRatio: '1',
          objectFit: 'cover',
          display: 'block',
          transition: 'transform 0.35s ease',
          '&:hover': { transform: 'scale(1.04)' },
        }}
      />
      {/* Overlay with uploader name */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(transparent, rgba(44,24,16,0.62))',
          p: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500, fontSize: '0.7rem' }}
        >
          {photo.uploader_name}
        </Typography>
        {isOwner && (
          <Tooltip title="מחק">
            <IconButton
              size="small"
              onClick={handleDelete}
              disabled={deleting}
              sx={{
                color: 'rgba(255,255,255,0.85)',
                p: 0.4,
                '&:hover': { color: '#fff', background: 'rgba(185,64,64,0.5)' },
              }}
            >
              {deleting
                ? <CircularProgress size={14} sx={{ color: '#fff' }} />
                : <DeleteOutlineIcon sx={{ fontSize: 16 }} />
              }
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </motion.div>
  );
}

// ─── Lightbox ────────────────────────────────────────────────

function Lightbox({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          background: 'rgba(20,10,5,0.95)',
          borderRadius: 4,
          overflow: 'hidden',
        },
      }}
    >
      <DialogContent sx={{ p: 0, position: 'relative' }}>
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute', top: 8, right: 8, zIndex: 1,
            color: '#fff', background: 'rgba(44,24,16,0.55)',
            '&:hover': { background: 'rgba(44,24,16,0.8)' },
          }}
        >
          <CloseIcon />
        </IconButton>
        <Box
          component="img"
          src={photo.url}
          alt={photo.caption ?? ''}
          sx={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', display: 'block' }}
        />
        {(photo.caption || photo.uploader_name) && (
          <Box sx={{ p: 1.5, textAlign: 'center' }}>
            {photo.caption && (
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                {photo.caption}
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
              uploaded by {photo.uploader_name}
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main ───────────────────────────────────────────────────

export default function PhotosTab() {
  const guest = useAppSelector((s) => s.auth.guest);
  const [photos, setPhotos]     = useState<Photo[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<Photo | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getPhotos();
      setPhotos(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (file: File) => {
    if (!guest) return;
    setError(null);
    try {
      const photo = await uploadPhoto(guest.id, file);
      setPhotos((prev) => [photo, ...prev]);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleDelete = (id: string) =>
    setPhotos((prev) => prev.filter((p) => p.id !== id));

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ mb: 3 }}>
            <Typography
              variant="h5"
              sx={{ fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 700, color: '#2C1810' }}
            >
              גלריית התמונות
            </Typography>
            <Typography variant="body2" sx={{ color: '#A08070' }}>
              {photos.length} תמונות שותפו עד כה
            </Typography>
          </Box>
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Typography color="error" sx={{ mb: 2, fontSize: '0.9rem' }}>
              {error}
            </Typography>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading skeletons */}
      {loading && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: 1.5,
          }}
        >
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} variant="rounded" sx={{ aspectRatio: '1', borderRadius: 2 }} />
          ))}
        </Box>
      )}

      {/* Empty state */}
      {!loading && photos.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Box
            sx={{
              textAlign: 'center',
              py: 6,
              px: 2,
            }}
          >
            <Typography sx={{ fontSize: '3rem', mb: 1 }}>📸</Typography>
            <Typography variant="h6" sx={{ color: '#5C3D2E', fontWeight: 600, mb: 0.5 }}>
              עדיין אין תמונות
            </Typography>
            <Typography variant="body2" sx={{ color: '#A08070', mb: 2 }}>
              היו הראשונים לשתף תמונה מהאירוע!
            </Typography>
            {guest && <DropZone onFileSelect={handleUpload} />}
          </Box>
        </motion.div>
      )}

      {/* Drop zone (when photos already exist) */}
      {!loading && photos.length > 0 && guest && (
        <DropZone onFileSelect={handleUpload} />
      )}

      {/* Grid — staggered entrance */}
      {!loading && photos.length > 0 && (
        <Box
          component={motion.div}
          layout
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: 1.5,
          }}
        >
          <AnimatePresence>
            {photos.map((photo, i) => (
              <motion.div
                key={photo.id}
                layout
                initial={{ opacity: 0, scale: 0.85, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.04, 0.5), ease: 'easeOut' }}
                style={{ position: 'relative', borderRadius: 16, overflow: 'hidden' }}
              >
                <PhotoCard
                  photo={photo}
                  guestId={guest?.id ?? ''}
                  onDelete={handleDelete}
                  onOpen={setLightbox}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </Box>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <Lightbox photo={lightbox} onClose={() => setLightbox(null)} />
        )}
      </AnimatePresence>
    </Box>
  );
}
