import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputAdornment,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { TaskCategory, TaskFormData, TaskStatus, WeddingTask } from '../../../types/domain';

// ─── Constants ────────────────────────────────────────────────

export const CATEGORY_OPTIONS: { value: TaskCategory; label: string; icon: string }[] = [
  { value: 'venue',          label: 'אולם',          icon: '🏛️' },
  { value: 'photographer',   label: 'צלם',           icon: '📸' },
  { value: 'dj',             label: 'DJ',            icon: '🎵' },
  { value: 'dress',          label: 'שמלה',          icon: '👗' },
  { value: 'suit',           label: 'חליפה',         icon: '🤵' },
  { value: 'rings',          label: 'טבעות',         icon: '💍' },
  { value: 'decorations',    label: 'קישוטים',       icon: '🌸' },
  { value: 'invitations',    label: 'הזמנות',        icon: '✉️' },
  { value: 'transportation', label: 'הסעות',         icon: '🚌' },
  { value: 'makeup',         label: 'איפור',         icon: '💄' },
  { value: 'hair',           label: 'שיער',          icon: '💇' },
  { value: 'rabbi',          label: 'רב',            icon: '✡️' },
  { value: 'flowers',        label: 'פרחים',         icon: '💐' },
  { value: 'food',           label: 'קייטרינג',      icon: '🍽️' },
  { value: 'alcohol',        label: 'אלכוהול',       icon: '🥂' },
  { value: 'gifts',          label: 'מתנות',         icon: '🎁' },
  { value: 'other',          label: 'אחר',           icon: '📋' },
];

export const STATUS_OPTIONS: { value: TaskStatus; label: string; color: 'default' | 'info' | 'warning' | 'success' | 'error' }[] = [
  { value: 'not_started', label: 'טרם התחיל',  color: 'default'  },
  { value: 'in_progress', label: 'בתהליך',     color: 'info'     },
  { value: 'waiting',     label: 'ממתין',      color: 'warning'  },
  { value: 'completed',   label: 'הושלם',      color: 'success'  },
  { value: 'cancelled',   label: 'בוטל',       color: 'error'    },
];

// ─── Types ────────────────────────────────────────────────────

interface Props {
  open: boolean;
  mode: 'add' | 'edit' | 'delete';
  task?: WeddingTask | null;
  onClose: () => void;
  onSave: (data: TaskFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
}

const EMPTY_FORM: TaskFormData = {
  task_name: '',
  supplier_name: null,
  category: 'other',
  status: 'not_started',
  deposit: 0,
  paid_amount: 0,
  total_amount: 0,
  due_date: null,
  phone: null,
  website: null,
  notes: null,
};

// ─── Component ───────────────────────────────────────────────

export default function TaskDialog({ open, mode, task, onClose, onSave, onDelete }: Props) {
  const [form, setForm] = useState<TaskFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setApiError(null);
      setErrors({});
      if (mode === 'edit' && task) {
        setForm({
          task_name:     task.task_name,
          supplier_name: task.supplier_name,
          category:      task.category,
          status:        task.status,
          deposit:       Number(task.deposit),
          paid_amount:   Number(task.paid_amount),
          total_amount:  Number(task.total_amount),
          due_date:      task.due_date,
          phone:         task.phone,
          website:       task.website,
          notes:         task.notes,
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [open, mode, task]);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.task_name.trim()) next.task_name = 'שם המשימה הוא שדה חובה';
    if (form.deposit < 0)     next.deposit     = 'מקדמה לא יכולה להיות שלילית';
    if (form.paid_amount < 0) next.paid_amount  = 'סכום ששולם לא יכול להיות שלילי';
    if (form.total_amount < 0) next.total_amount = 'סכום כולל לא יכול להיות שלילי';
    if (form.paid_amount > form.total_amount && form.total_amount > 0)
      next.paid_amount = 'סכום ששולם לא יכול לעלות על הסכום הכולל';
    if (form.deposit > form.total_amount && form.total_amount > 0)
      next.deposit = 'מקדמה לא יכולה לעלות על הסכום הכולל';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function setField<K extends keyof TaskFormData>(key: K, value: TaskFormData[K]) {
    setForm(f => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setApiError(null);
    try {
      await onSave(form);
      onClose();
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'שגיאה בשמירה');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setSaving(true);
    setApiError(null);
    try {
      await onDelete();
      onClose();
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'שגיאה במחיקה');
    } finally {
      setSaving(false);
    }
  }

  const isDelete = mode === 'delete';
  const title = mode === 'add' ? 'הוספת משימה' : mode === 'edit' ? 'עריכת משימה' : 'מחיקת משימה';

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        component: motion.div,
        initial: { opacity: 0, scale: 0.9, y: 24 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.92, y: 16 },
        transition: { duration: 0.28, ease: 'easeOut' },
        sx: { borderRadius: 4, overflow: 'hidden' },
      } as never}
    >
      {/* Header gradient bar */}
      <Box sx={{ height: 4, background: 'linear-gradient(90deg, #E0C97A 0%, #C9A84C 50%, #9A7833 100%)' }} />

      <DialogTitle sx={{ fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 700, fontSize: '1.3rem', pt: 2.5 }}>
        {title}
      </DialogTitle>

      <DialogContent dividers>
        <AnimatePresence>
          {apiError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {isDelete ? (
          <Typography sx={{ py: 1, fontSize: '1rem' }}>
            האם אתה בטוח שברצונך למחוק את המשימה{' '}
            <strong>&ldquo;{task?.task_name}&rdquo;</strong>?<br />
            פעולה זו לא ניתנת לביטול.
          </Typography>
        ) : (
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {/* Task Name */}
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                label="שם המשימה *"
                fullWidth
                value={form.task_name}
                onChange={e => setField('task_name', e.target.value)}
                error={!!errors.task_name}
                helperText={errors.task_name}
              />
            </Grid>

            {/* Category */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                select
                label="קטגוריה"
                fullWidth
                value={form.category}
                onChange={e => setField('category', e.target.value as TaskCategory)}
              >
                {CATEGORY_OPTIONS.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.icon} {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Supplier */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="ספק / נותן שירות"
                fullWidth
                value={form.supplier_name ?? ''}
                onChange={e => setField('supplier_name', e.target.value || null)}
              />
            </Grid>

            {/* Status */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label="סטטוס"
                fullWidth
                value={form.status}
                onChange={e => setField('status', e.target.value as TaskStatus)}
              >
                {STATUS_OPTIONS.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Total Amount */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="סכום כולל"
                type="number"
                fullWidth
                value={form.total_amount}
                onChange={e => setField('total_amount', Math.max(0, Number(e.target.value)))}
                error={!!errors.total_amount}
                helperText={errors.total_amount}
                InputProps={{ startAdornment: <InputAdornment position="start">₪</InputAdornment> }}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            {/* Deposit */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="מקדמה"
                type="number"
                fullWidth
                value={form.deposit}
                onChange={e => setField('deposit', Math.max(0, Number(e.target.value)))}
                error={!!errors.deposit}
                helperText={errors.deposit}
                InputProps={{ startAdornment: <InputAdornment position="start">₪</InputAdornment> }}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            {/* Paid Amount */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="שולם עד כה"
                type="number"
                fullWidth
                value={form.paid_amount}
                onChange={e => setField('paid_amount', Math.max(0, Number(e.target.value)))}
                error={!!errors.paid_amount}
                helperText={errors.paid_amount}
                InputProps={{ startAdornment: <InputAdornment position="start">₪</InputAdornment> }}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            {/* Due Date */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="תאריך יעד"
                type="date"
                fullWidth
                value={form.due_date ?? ''}
                onChange={e => setField('due_date', e.target.value || null)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Phone */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="טלפון ספק"
                fullWidth
                value={form.phone ?? ''}
                onChange={e => setField('phone', e.target.value || null)}
              />
            </Grid>

            {/* Website */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                label="אתר אינטרנט"
                fullWidth
                value={form.website ?? ''}
                onChange={e => setField('website', e.target.value || null)}
              />
            </Grid>

            {/* Notes */}
            <Grid size={{ xs: 12 }}>
              <TextField
                label="הערות"
                fullWidth
                multiline
                rows={3}
                value={form.notes ?? ''}
                onChange={e => setField('notes', e.target.value || null)}
              />
            </Grid>
          </Grid>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button variant="outlined" onClick={onClose} disabled={saving}>
          ביטול
        </Button>
        {isDelete ? (
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={saving}
          >
            {saving ? 'מוחק...' : 'מחק משימה'}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{ background: 'linear-gradient(135deg, #E0C97A 0%, #C9A84C 50%, #9A7833 100%)' }}
          >
            {saving ? 'שומר...' : mode === 'add' ? 'הוסף משימה' : 'שמור שינויים'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
