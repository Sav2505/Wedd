import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box, Typography, IconButton, CircularProgress,
  Dialog, DialogContent, Skeleton, Tooltip, LinearProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { motion, AnimatePresence } from 'framer-motion';
import { getPhotos, uploadPhoto, deletePhoto } from '../services/photos.service';
import { Photo } from '../types/domain';
import { useAppSelector } from '../store';
import { getWeddingInfo } from '../services/info.service';

// Base URL for binary photo endpoints (/photos/:id/thumb|full)
// On prod these are served by the API server (VITE_API_URL), not the current origin
const API_BASE = import.meta.env.VITE_API_URL ?? '';
const photoSrc = (url: string) => (url.startsWith('/photos/') ? `${API_BASE}${url}` : url);

// ─── Types ───────────────────────────────────────────────────

interface QueueItem {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  progress: number;
  errorMsg?: string;
  weddingId: number | null;
}

// ─── Drop zone ───────────────────────────────────────────────

function DropZone({ onFilesSelect, uploading }: { onFilesSelect: (files: File[]) => void; uploading: boolean }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const accept = 'image/jpeg,image/png,image/webp,image/gif';

  const pickFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const valid = Array.from(fileList).filter((f) => accept.includes(f.type));
    if (valid.length) onFilesSelect(valid);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    pickFiles(e.dataTransfer.files);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        style={{ display: 'none' }}
        onChange={(e) => { pickFiles(e.target.files); e.target.value = ''; }}
      />
      <motion.div animate={{ scale: dragOver ? 1.02 : 1 }} transition={{ duration: 0.18 }}>
        <Box
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          sx={{
            border: `2px dashed ${dragOver ? '#C9A84C' : 'rgba(201,168,76,0.35)'}`,
            borderRadius: 4,
            p: 3,
            mb: 2.5,
            textAlign: 'center',
            cursor: uploading ? 'default' : 'pointer',
            background: dragOver ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.4)',
            transition: 'all 0.2s ease',
            opacity: uploading ? 0.6 : 1,
            '&:hover': !uploading ? { borderColor: '#C9A84C', background: 'rgba(201,168,76,0.05)' } : {},
          }}
        >
          <motion.div animate={{ y: dragOver ? -4 : 0 }} transition={{ duration: 0.2 }}>
            <CloudUploadIcon sx={{ fontSize: 32, color: dragOver ? '#C9A84C' : '#C0A090', mb: 0.5 }} />
          </motion.div>
          <Typography variant="body2" sx={{ color: dragOver ? '#9A7833' : '#A08070', fontWeight: 500 }}>
            {dragOver ? 'שחרר כאן להעלאה' : 'גרור תמונות לכאן, או לחץ לבחירה'}
          </Typography>
          <Typography variant="caption" sx={{ color: '#C0A090' }}>
            ניתן לבחור כמה תמונות בבת אחת
          </Typography>
        </Box>
      </motion.div>
    </>
  );
}

// ─── Upload queue panel ──────────────────────────────────────

function UploadQueue({ items, onClear }: { items: QueueItem[]; onClear: () => void }) {
  if (items.length === 0) return null;
  const allDone = items.every((i) => i.status === 'done' || i.status === 'error');

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <Box
        sx={{
          mb: 2.5,
          borderRadius: 3,
          background: 'rgba(255,255,255,0.7)',
          border: '1px solid rgba(201,168,76,0.25)',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ px: 2, py: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
          <Typography variant="caption" sx={{ color: '#7A5C3A', fontWeight: 600, fontSize: '0.78rem' }}>
            {allDone
              ? `הועלו ${items.filter((i) => i.status === 'done').length} מתוך ${items.length} תמונות`
              : `מעלה תמונות… (${items.filter((i) => i.status === 'done').length}/${items.length})`}
          </Typography>
          {allDone && (
            <Typography
              variant="caption"
              onClick={onClear}
              sx={{ color: '#C9A84C', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', '&:hover': { color: '#9A7833' } }}
            >
              נקה
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, p: 1.5 }}>
          {items.map((item) => (
            <Box key={item.id} sx={{ position: 'relative', width: 64, flexShrink: 0 }}>
              <Box
                component="img"
                src={item.previewUrl}
                sx={{
                  width: 64, height: 64,
                  objectFit: 'cover',
                  borderRadius: 2,
                  display: 'block',
                  filter: item.status === 'pending' ? 'grayscale(60%)' : 'none',
                  transition: 'filter 0.3s',
                }}
              />
              {/* Progress bar overlay */}
              {item.status === 'uploading' && (
                <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, overflow: 'hidden' }}>
                  <LinearProgress
                    variant="determinate"
                    value={item.progress}
                    sx={{ height: 3, '& .MuiLinearProgress-bar': { background: '#C9A84C' }, background: 'rgba(255,255,255,0.4)' }}
                  />
                </Box>
              )}
              {/* Status icon */}
              {item.status === 'done' && (
                <CheckCircleOutlineIcon sx={{ position: 'absolute', top: 2, right: 2, fontSize: 18, color: '#4CAF50', background: 'rgba(255,255,255,0.85)', borderRadius: '50%' }} />
              )}
              {item.status === 'error' && (
                <Tooltip title={item.errorMsg ?? 'שגיאה'}>
                  <ErrorOutlineIcon sx={{ position: 'absolute', top: 2, right: 2, fontSize: 18, color: '#E53935', background: 'rgba(255,255,255,0.85)', borderRadius: '50%' }} />
                </Tooltip>
              )}
              {item.status === 'uploading' && (
                <CircularProgress size={16} sx={{ position: 'absolute', top: 4, right: 4, color: '#C9A84C' }} />
              )}
            </Box>
          ))}
        </Box>
      </Box>
    </motion.div>
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
      await deletePhoto(photo.id);
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
        src={photoSrc(photo.url)}
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
      <Box
        sx={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(transparent, rgba(44,24,16,0.62))',
          p: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500, fontSize: '0.7rem' }}>
          {photo.uploader_name}
        </Typography>
        {isOwner && (
          <Tooltip title="מחק">
            <IconButton
              size="small"
              onClick={handleDelete}
              disabled={deleting}
              sx={{ color: 'rgba(255,255,255,0.85)', p: 0.4, '&:hover': { color: '#fff', background: 'rgba(185,64,64,0.5)' } }}
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

function Lightbox({ photo, photos, onClose, onNav }: {
  photo: Photo;
  photos: Photo[];
  onClose: () => void;
  onNav: (photo: Photo) => void;
}) {
  const idx = photos.findIndex((p) => p.id === photo.id);
  const hasPrev = idx > 0;
  const hasNext = idx < photos.length - 1;

  // Use /full endpoint for lightbox if it's a binary photo (url contains /thumb)
  const fullSrc = photoSrc(
    photo.url.includes('/thumb') ? photo.url.replace('/thumb', '/full') : photo.url,
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasNext) onNav(photos[idx + 1]);
      if (e.key === 'ArrowRight' && hasPrev) onNav(photos[idx - 1]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [idx, hasPrev, hasNext, onClose, onNav, photos]);

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { background: 'rgba(20,10,5,0.96)', borderRadius: 4, overflow: 'hidden' } }}
    >
      <DialogContent sx={{ p: 0, position: 'relative' }}>
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2, color: '#fff', background: 'rgba(44,24,16,0.55)', '&:hover': { background: 'rgba(44,24,16,0.8)' } }}
        >
          <CloseIcon />
        </IconButton>

        {/* Prev / Next arrows */}
        {hasPrev && (
          <IconButton
            onClick={() => onNav(photos[idx - 1])}
            sx={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 2, color: '#fff', background: 'rgba(44,24,16,0.45)', '&:hover': { background: 'rgba(44,24,16,0.75)' } }}
          >
            <ArrowForwardIosIcon fontSize="small" />
          </IconButton>
        )}
        {hasNext && (
          <IconButton
            onClick={() => onNav(photos[idx + 1])}
            sx={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 2, color: '#fff', background: 'rgba(44,24,16,0.45)', '&:hover': { background: 'rgba(44,24,16,0.75)' } }}
          >
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
        )}

        <Box
          key={photo.id}
          component="img"
          src={fullSrc}
          alt={photo.caption ?? ''}
          sx={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', display: 'block' }}
        />
        {(photo.caption || photo.uploader_name) && (
          <Box sx={{ p: 1.5, textAlign: 'center' }}>
            {photo.caption && (
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>{photo.caption}</Typography>
            )}
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
              {photo.uploader_name}
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
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<Photo | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [weddingId, setWeddingId] = useState<number | null>(null);

  const uploading = queue.some((q) => q.status === 'pending' || q.status === 'uploading');

  // Track photo IDs seen so polling only adds genuinely new ones
  const seenIds = useRef<Set<string>>(new Set());

  const load = useCallback(async (silent = false) => {
    if (!weddingId) return;

    try {
      const data = await getPhotos(weddingId);
      setPhotos(data);
      data.forEach((p) => seenIds.current.add(p.id));
    } catch (e) {
      if (!silent) setError((e as Error).message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [weddingId]);

  useEffect(() => {
    const init = async () => {
      try {
        const info = await getWeddingInfo();
        setWeddingId(info.id);
      } catch {
        setError('שגיאה בטעינת פרטי החתונה');
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (weddingId) {
      load();
    }
  }, [weddingId, load]);

  // Poll every 30s to show other guests' new uploads
  useEffect(() => {
    const timer = setInterval(() => load(true), 30_000);
    return () => clearInterval(timer);
  }, [load]);

  const handleFilesSelect = async (files: File[]) => {
    if (!guest) return;
    setError(null);

    // Build initial queue entries with local previews
    const newItems: QueueItem[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      weddingId: weddingId,
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
      progress: 0,
    }));
    setQueue((prev) => [...prev, ...newItems]);

    // Upload sequentially, updating queue state as we go
    for (const item of newItems) {
      setQueue((prev) => prev.map((q) => q.id === item.id ? { ...q, status: 'uploading' } : q));
      try {
        const photo = await uploadPhoto(
          guest.id,
          item.file,
          weddingId,
          undefined,
          (pct) => setQueue((prev) => prev.map((q) => q.id === item.id ? { ...q, progress: pct } : q)),
        );
        seenIds.current.add(photo.id);
        setPhotos((prev) => [photo, ...prev]);
        setQueue((prev) => prev.map((q) => q.id === item.id ? { ...q, status: 'done', progress: 100 } : q));
      } catch (e) {
        setQueue((prev) => prev.map((q) =>
          q.id === item.id ? { ...q, status: 'error', errorMsg: (e as Error).message } : q,
        ));
      }
    }
  };

  const handleDelete = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    seenIds.current.delete(id);
  };

  const clearQueue = () => {
    queue.forEach((q) => URL.revokeObjectURL(q.previewUrl));
    setQueue([]);
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="h5"
            sx={{ fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 700, color: '#2C1810' }}
          >
            גלריית התמונות - שתפו אותנו :)
          </Typography>
          <Typography variant="body2" sx={{ color: '#A08070' }}>
            {photos.length} תמונות שותפו עד כה, שתפו גם אתם עם עוד תמונות מהאירוע !
          </Typography>
        </Box>
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <Typography color="error" sx={{ mb: 2, fontSize: '0.9rem' }}>{error}</Typography>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drop zone */}
      {guest && <DropZone onFilesSelect={handleFilesSelect} uploading={uploading} />}

      {/* Upload queue panel */}
      <AnimatePresence>
        {queue.length > 0 && <UploadQueue items={queue} onClear={clearQueue} />}
      </AnimatePresence>

      {/* Loading skeletons */}
      {loading && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 1.5 }}>
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} variant="rounded" sx={{ aspectRatio: '1', borderRadius: 2 }} />
          ))}
        </Box>
      )}

      {/* Empty state */}
      {!loading && photos.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
            <Typography sx={{ fontSize: '3rem', mb: 1 }}>📸</Typography>
            <Typography variant="h6" sx={{ color: '#5C3D2E', fontWeight: 600, mb: 0.5 }}>
              עדיין אין תמונות
            </Typography>
            <Typography variant="body2" sx={{ color: '#A08070' }}>
              היו הראשונים לשתף תמונה מהאירוע!
            </Typography>
          </Box>
        </motion.div>
      )}

      {/* Photo grid */}
      {!loading && photos.length > 0 && (
        <Box
          component={motion.div}
          layout
          sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 1.5 }}
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
          <Lightbox
            photo={lightbox}
            photos={photos}
            onClose={() => setLightbox(null)}
            onNav={setLightbox}
          />
        )}
      </AnimatePresence>
    </Box>
  );
}
