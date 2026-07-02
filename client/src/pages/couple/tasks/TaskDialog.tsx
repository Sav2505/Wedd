import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  InputAdornment,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import HomeWorkOutlinedIcon from '@mui/icons-material/HomeWorkOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import RestaurantMenuOutlinedIcon from '@mui/icons-material/RestaurantMenuOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
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
  guestCount?: number;
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
  price_per_plate: null,
  min_commitment: null,
  due_date: null,
  phone: null,
  website: null,
  notes: null,
};

// ─── Venue Calculator Sub-component ──────────────────────────

interface VenueCalcProps {
  pricePerPlate: number;
  minCommitment: number;
  guestCount: number;
  computedTotal: number;
}

function VenueCalculatorCard({ pricePerPlate, minCommitment, guestCount, computedTotal }: VenueCalcProps) {
  if (pricePerPlate <= 0) return null;
  const effectiveGuests = Math.max(guestCount, minCommitment > 0 ? minCommitment : 0);
  const usingMinimum    = minCommitment > 0 && guestCount < minCommitment;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25 }}
    >
      <Box
        sx={{
          mt: 0.5, p: 2, borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(224,201,122,0.05) 100%)',
          border: '1px solid rgba(201,168,76,0.25)',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <PeopleAltOutlinedIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">אורחים מוזמנים</Typography>
            </Box>
            <Typography variant="caption" fontWeight={600}>{guestCount.toLocaleString('he-IL')}</Typography>
          </Box>

          {minCommitment > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <WarningAmberOutlinedIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">מינ׳ התחייבות</Typography>
              </Box>
              <Typography variant="caption" fontWeight={600}>{minCommitment.toLocaleString('he-IL')}</Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <RestaurantMenuOutlinedIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">מחיר למנה</Typography>
            </Box>
            <Typography variant="caption" fontWeight={600}>₪{pricePerPlate.toLocaleString('he-IL')}</Typography>
          </Box>

          <Divider sx={{ my: 0.5, borderColor: 'rgba(201,168,76,0.2)' }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <CheckCircleOutlineIcon sx={{ fontSize: 15, color: usingMinimum ? '#ff9800' : '#4caf50' }} />
              <Typography variant="caption" color="text.secondary">
                {usingMinimum ? 'חיוב לפי מינ׳ התחייבות' : 'חיוב לפי מספר מוזמנים'}
              </Typography>
            </Box>
            <Chip
              label={`${effectiveGuests.toLocaleString('he-IL')} אורחים`}
              size="small"
              sx={{
                height: 20, fontSize: '0.7rem', fontWeight: 700,
                bgcolor: usingMinimum ? 'rgba(255,152,0,0.12)' : 'rgba(76,175,80,0.12)',
                color: usingMinimum ? '#e65100' : '#2e7d32',
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5, pt: 1, borderTop: '1.5px solid rgba(201,168,76,0.3)' }}>
            <Typography variant="body2" fontWeight={700} color="text.primary">סכום כולל מחושב</Typography>
            <Typography variant="h6" fontWeight={800} sx={{ color: 'primary.dark', fontFamily: "'Frank Ruhl Libre', serif" }}>
              ₪{computedTotal.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center', mt: 0.25 }}>
            {effectiveGuests.toLocaleString('he-IL')} × ₪{pricePerPlate.toLocaleString('he-IL')} = ₪{computedTotal.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
          </Typography>
        </Box>
      </Box>
    </motion.div>
  );
}

// ─── Component ───────────────────────────────────────────────

export default function TaskDialog({ open, mode, task, guestCount = 0, onClose, onSave, onDelete }: Props) {
  const [form, setForm] = useState<TaskFormData>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isVenue = form.category === 'venue';

  // Venue computed total
  const venueComputedTotal = useMemo(() => {
    if (!isVenue) return 0;
    const ppp  = Number(form.price_per_plate ?? 0);
    const minC = Number(form.min_commitment ?? 0);
    const effective = Math.max(guestCount, minC);
    return ppp > 0 ? effective * ppp : 0;
  }, [isVenue, form.price_per_plate, form.min_commitment, guestCount]);

  useEffect(() => {
    if (open) {
      setApiError(null);
      setErrors({});
      if (mode === 'edit' && task) {
        setForm({
          task_name:       task.task_name,
          supplier_name:   task.supplier_name,
          category:        task.category,
          status:          task.status,
          deposit:         Number(task.deposit),
          paid_amount:     Number(task.paid_amount),
          total_amount:    Number(task.total_amount),
          price_per_plate: task.price_per_plate != null ? Number(task.price_per_plate) : null,
          min_commitment:  task.min_commitment  != null ? Number(task.min_commitment)  : null,
          due_date:        task.due_date,
          phone:           task.phone,
          website:         task.website,
          notes:           task.notes,
        });
      } else {
        setForm(EMPTY_FORM);
      }
    }
  }, [open, mode, task]);

  // Keep total_amount in sync with venue computation
  useEffect(() => {
    if (isVenue && venueComputedTotal > 0) {
      setForm(f => ({ ...f, total_amount: venueComputedTotal }));
    }
  }, [isVenue, venueComputedTotal]);

  // Clear venue-only fields when user switches away from venue category
  function handleCategoryChange(cat: TaskCategory) {
    if (cat !== 'venue') {
      setForm(f => ({ ...f, category: cat, price_per_plate: null, min_commitment: null }));
    } else {
      setField('category', cat);
    }
    if (errors.price_per_plate) setErrors(e => { const n = { ...e }; delete n.price_per_plate; return n; });
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.task_name.trim()) next.task_name = 'שם המשימה הוא שדה חובה';

    if (isVenue) {
      if (!form.price_per_plate || form.price_per_plate <= 0)
        next.price_per_plate = 'מחיר למנה הוא שדה חובה לאולם';
    } else {
      if (form.total_amount < 0) next.total_amount = 'סכום כולל לא יכול להיות שלילי';
    }

    if (form.deposit < 0)     next.deposit    = 'מקדמה לא יכולה להיות שלילית';
    if (form.paid_amount < 0) next.paid_amount = 'סכום ששולם לא יכול להיות שלילי';

    const effectiveTotal = isVenue ? venueComputedTotal : form.total_amount;
    if (effectiveTotal > 0 && form.paid_amount > effectiveTotal)
      next.paid_amount = 'סכום ששולם לא יכול לעלות על הסכום הכולל';
    if (effectiveTotal > 0 && form.deposit > effectiveTotal)
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
      // For venue tasks, lock total_amount to the computed value
      const payload: TaskFormData = isVenue
        ? { ...form, total_amount: venueComputedTotal > 0 ? venueComputedTotal : form.total_amount }
        : form;
      await onSave(payload);
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
        transition: { duration: 0.28, ease: 'easeOut' as const },
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
                onChange={e => handleCategoryChange(e.target.value as TaskCategory)}
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

            {/* ══ VENUE PRICING SECTION ══ */}
            <AnimatePresence>
              {isVenue && (
                <Grid size={{ xs: 12 }}>
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' as const }}
                    style={{ overflow: 'hidden' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, mt: 0.5 }}>
                      <HomeWorkOutlinedIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                      <Typography variant="subtitle2" fontWeight={700} color="primary.dark">
                        תמחור אולם — חישוב אוטומטי
                      </Typography>
                      <Chip
                        label={`${guestCount} אורחים בפועל`}
                        size="small"
                        sx={{ height: 20, fontSize: '0.7rem', bgcolor: 'rgba(201,168,76,0.12)', color: 'primary.dark', fontWeight: 700 }}
                      />
                    </Box>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="מחיר למנה *"
                          type="number"
                          fullWidth
                          value={form.price_per_plate ?? ''}
                          onChange={e => setField('price_per_plate', e.target.value ? Math.max(0, Number(e.target.value)) : null)}
                          error={!!errors.price_per_plate}
                          helperText={errors.price_per_plate ?? 'מחיר לאורח אחד'}
                          InputProps={{ startAdornment: <InputAdornment position="start">₪</InputAdornment> }}
                          inputProps={{ min: 0, step: 1 }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="מינ׳ אורחים להתחייבות"
                          type="number"
                          fullWidth
                          value={form.min_commitment ?? ''}
                          onChange={e => setField('min_commitment', e.target.value ? Math.max(0, Number(e.target.value)) : null)}
                          helperText="המינימום שהאולם מחייב"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <PeopleAltOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                              </InputAdornment>
                            ),
                          }}
                          inputProps={{ min: 0, step: 1 }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <AnimatePresence>
                          {Number(form.price_per_plate) > 0 && (
                            <VenueCalculatorCard
                              pricePerPlate={Number(form.price_per_plate)}
                              minCommitment={Number(form.min_commitment ?? 0)}
                              guestCount={guestCount}
                              computedTotal={venueComputedTotal}
                            />
                          )}
                        </AnimatePresence>
                      </Grid>
                    </Grid>
                    <Divider sx={{ mt: 2, mb: 0.5, borderColor: 'rgba(201,168,76,0.2)' }} />
                  </motion.div>
                </Grid>
              )}
            </AnimatePresence>

            {/* Total Amount — manual entry (non-venue) or read-only computed (venue) */}
            {!isVenue ? (
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
            ) : venueComputedTotal > 0 ? (
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="סכום כולל (מחושב)"
                  fullWidth
                  value={`₪${venueComputedTotal.toLocaleString('he-IL', { maximumFractionDigits: 0 })}`}
                  InputProps={{ readOnly: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'rgba(201,168,76,0.06)',
                      '& fieldset': { borderColor: 'rgba(201,168,76,0.4)' },
                    },
                    '& input': { fontWeight: 700, color: 'primary.dark' },
                  }}
                  helperText="מחושב אוטומטית לפי תמחור האולם"
                />
              </Grid>
            ) : null}

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
