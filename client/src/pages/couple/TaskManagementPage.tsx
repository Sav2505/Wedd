import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  Fab,
  Skeleton,
  Snackbar,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import { AnimatePresence, motion } from 'framer-motion';
import { ManagedGuest, TaskFormData, WeddingTask } from '../../types/domain';
import { createTask, deleteTask, getTasks, updateTask } from '../../services/tasks.service';
import { getGuests, updateGuest } from '../../services/guests.service';
import TaskSummaryCards from './tasks/TaskSummaryCards';
import TaskTable from './tasks/TaskTable';
import TaskDialog from './tasks/TaskDialog';
import BudgetAnalytics from './tasks/BudgetAnalytics';
import { getEffectivePartySize } from '../../utils/effectiveAttendance';
import GuestGiftsTable from './tasks/GuestsGiftsTable';
import { useWeddingInfo } from '../../hooks/useWeddingInfo';

// ─── Dialog mode ─────────────────────────────────────────────

type DialogMode = 'closed' | 'add' | 'edit' | 'delete';

// ─── Component ───────────────────────────────────────────────

const AVG_GIFT_KEY = 'wedding_avg_gift';

export default function TaskManagementPage() {
  const [tasks, setTasks] = useState<WeddingTask[]>([]);
  const [guestCount, setGuestCount] = useState(0);
  const [avgGift, setAvgGiftState] = useState<number>(() => {
    const stored = localStorage.getItem(AVG_GIFT_KEY);
    return stored ? Number(stored) : 450;
  });
  const [guests, setGuests] = useState<ManagedGuest[]>([]);
  const confirmedCount = useMemo(
    () => guests
      .filter(g => g.rsvp_status === 'COMING')
      .reduce((sum, g) => sum + getEffectivePartySize(g), 0),
    [guests],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { info } = useWeddingInfo();

  const [dialogMode, setDialogMode] = useState<DialogMode>('closed');
  const [selectedTask, setSelectedTask] = useState<WeddingTask | null>(null);

  function handleAvgGiftChange(v: number) {
    const safe = Math.max(0, v);
    setAvgGiftState(safe);
    localStorage.setItem(AVG_GIFT_KEY, String(safe));
  }

  // ─── Load data ───────────────────────────────────────────
  const reload = useCallback(async () => {
    if (!info?.id) return;

    try {
      const [fetchedTasks, fetchedGuests] = await Promise.all([
        getTasks(info.id),
        getGuests('', info?.id).catch(() => [] as Awaited<ReturnType<typeof getGuests>>),
      ]);

      setGuests(fetchedGuests);

      if (fetchedGuests.length > 0) {
        const totalGuests = fetchedGuests.reduce((sum, g) => sum + getEffectivePartySize(g), 0);
        setGuestCount(totalGuests);

        const confirmed = fetchedGuests
          .filter(g => g.rsvp_status === 'COMING')
          .reduce((sum, g) => sum + getEffectivePartySize(g), 0);

        // Auto-sync venue task total_amount with current guest counts (silent, no toast)
        const venueResults = await Promise.allSettled(
          fetchedTasks
            .filter(t => t.category === 'venue' && (t.price_per_plate ?? 0) > 0)
            .map(async task => {
              const ppp  = Number(task.price_per_plate);
              const minC = Number(task.min_commitment ?? 0);
              const usingConfirmed = confirmed > 0 && confirmed > minC;
              const rawGuests = Math.round(totalGuests * 0.9);
              const effective = usingConfirmed ? confirmed : Math.max(rawGuests, minC);
              const computed  = Math.round(effective * ppp);
              if (Math.abs(computed - Number(task.total_amount)) <= 0.5) return task;
              return updateTask(task.id, { total_amount: computed });
            })
        );

        const updatedMap = new Map(
          venueResults
            .filter((r): r is PromiseFulfilledResult<WeddingTask> => r.status === 'fulfilled')
            .map(r => [r.value.id, r.value])
        );

        setTasks(fetchedTasks.map(t => updatedMap.get(t.id) ?? t));
      } else {
        setTasks(fetchedTasks);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת נתונים');
    }
  }, [info?.id]);

  useEffect(() => {
    if (!info?.id) return;

    setLoading(true);
    reload().finally(() => setLoading(false));
  }, [reload, info?.id]);

  // ─── CRUD handlers ───────────────────────────────────────

  async function handleSave(data: TaskFormData): Promise<void> {
    if (dialogMode === 'add') {
      if (!info?.id) return;
      const newTask = await createTask(info.id, data);
      setTasks(prev => [newTask, ...prev]);
      setToast('המשימה נוספה בהצלחה ✓');
    } else if (dialogMode === 'edit' && selectedTask) {
      const updated = await updateTask(selectedTask.id, data);
      setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
      setToast('המשימה עודכנה בהצלחה ✓');
    }
  }

  async function handleDelete(): Promise<void> {
    if (!selectedTask) return;
    await deleteTask(selectedTask.id);
    setTasks(prev => prev.filter(t => t.id !== selectedTask.id));
    setToast('המשימה נמחקה');
  }

  async function handleUpdateGiftAmount(guestId: string, amount: number | null): Promise<void> {
    await updateGuest(guestId, { gift_amount: amount });
    setGuests(prev => prev.map(g => g.id === guestId ? { ...g, gift_amount: amount } : g));
  }

  async function handleUpdateGiftKind(guestId: string, kind: string | null): Promise<void> {
    await updateGuest(guestId, { gift_kind: kind });
    setGuests(prev => prev.map(g => g.id === guestId ? { ...g, gift_kind: kind } : g));
  }

  function openAdd() { setSelectedTask(null); setDialogMode('add'); }
  function openEdit(t: WeddingTask) { setSelectedTask(t); setDialogMode('edit'); }
  function openDelete(t: WeddingTask) { setSelectedTask(t); setDialogMode('delete'); }
  function closeDialog() { setDialogMode('closed'); }

  // ─── Derived state ───────────────────────────────────────

  const skeletonRows = useMemo(() => Array.from({ length: 4 }), []);

  // ─── Render ──────────────────────────────────────────────

  return (
    <Box sx={{ pb: 10, px: { xs: 1, sm: 2 }, pt: 1, maxWidth: 1400, mx: 'auto', width: '100%' }}>

      {/* ─── Page Header ─── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, mt: 1 }}>
          <AssignmentOutlinedIcon sx={{ color: 'primary.main', fontSize: 32 }} />
          <Box>
            <Typography
              variant="h5"
              sx={{ fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 700, lineHeight: 1.15 }}
            >
              מעקב משימות
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ניהול תקציב וכל המשימות לחתונה
            </Typography>
          </Box>
        </Box>
      </motion.div>

      {/* ─── Error banner ─── */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Loading state ─── */}
      {loading ? (
        <Box>
          {/* Summary card skeletons */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
            {skeletonRows.concat(skeletonRows).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={100} sx={{ borderRadius: 3 }} />
            ))}
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress sx={{ color: 'primary.main' }} />
          </Box>
        </Box>
      ) : (
        <>
          {/* ─── Summary Cards ─── */}
          <Box data-tour-anchor="tasks-summary">
            <TaskSummaryCards tasks={tasks} guests={guests} guestCount={guestCount} avgGift={avgGift} onAvgGiftChange={handleAvgGiftChange} />
          </Box>

          {/* ─── Tasks Table ─── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
          >
            <Box data-tour-anchor="tasks-table" sx={{ mb: 1.5 }}>
              <Typography
                variant="h6"
                sx={{ fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 700, mb: 1.5 }}
              >
                רשימת משימות
              </Typography>
              <TaskTable tasks={tasks} onEdit={openEdit} onDelete={openDelete} />
            </Box>
          </motion.div>

          {/* ─── Divider ─── */}
          <Divider sx={{ my: 4, borderColor: 'rgba(201,168,76,0.25)' }} />

          {/* ─── Guest Gifts ─── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.28, ease: 'easeOut' }}
          >
            <Box data-tour-anchor="tasks-gifts-table">
              <GuestGiftsTable
                guests={guests}
                onUpdateGiftAmount={handleUpdateGiftAmount}
                onUpdateGiftKind={handleUpdateGiftKind}
              />
            </Box>
          </motion.div>

          {/* ─── Divider ─── */}
          <Divider sx={{ my: 4, borderColor: 'rgba(201,168,76,0.25)' }} />

          {/* ─── Budget Analytics ─── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35, ease: 'easeOut' }}
          >
            <Box data-tour-anchor="tasks-budget-analytics">
              <BudgetAnalytics tasks={tasks} />
            </Box>
          </motion.div>
        </>
      )}

      {/* ─── FAB ─── */}
      <Fab
        data-tour-anchor="tasks-add-button"
        onClick={openAdd}
        sx={{
          position: 'fixed',
          bottom: { xs: 24, sm: 32 },
          left: { xs: 24, sm: 32 },
          background: 'linear-gradient(135deg, #E0C97A 0%, #C9A84C 50%, #9A7833 100%)',
          color: '#fff',
          boxShadow: '0 4px 20px rgba(201,168,76,0.45)',
          '&:hover': { transform: 'scale(1.08)', boxShadow: '0 6px 28px rgba(201,168,76,0.55)' },
          transition: 'transform 0.2s, box-shadow 0.2s',
          zIndex: 1200,
        }}
        aria-label="הוסף משימה"
      >
        <AddIcon />
      </Fab>

      {/* ─── Dialog ─── */}
      <AnimatePresence>
        {dialogMode !== 'closed' && (
          <TaskDialog
            open
            mode={dialogMode}
            task={selectedTask}
            guestCount={guestCount}
            confirmedCount={confirmedCount}
            onClose={closeDialog}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        )}
      </AnimatePresence>

      {/* ─── Toast ─── */}
      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
