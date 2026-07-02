import { useMemo, useState } from 'react';
import {
  Box,
  Chip,
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PhoneIcon from '@mui/icons-material/Phone';
import { AnimatePresence, motion } from 'framer-motion';
import { TaskCategory, TaskStatus, WeddingTask } from '../../../types/domain';
import { CATEGORY_OPTIONS, STATUS_OPTIONS } from './TaskDialog';

// ─── Helpers ─────────────────────────────────────────────────

function fmtMoney(n: number) {
  return n === 0 ? '—' : `₪${Number(n).toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Types ────────────────────────────────────────────────────

type SortKey = 'task_name' | 'supplier_name' | 'category' | 'status' | 'total_amount' | 'due_date';
type SortDir = 'asc' | 'desc';

interface Props {
  tasks: WeddingTask[];
  onEdit: (task: WeddingTask) => void;
  onDelete: (task: WeddingTask) => void;
}

const STATUS_COLOR: Record<TaskStatus, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  not_started: 'default',
  in_progress:  'info',
  waiting:      'warning',
  completed:    'success',
  cancelled:    'error',
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  not_started: 'טרם התחיל',
  in_progress:  'בתהליך',
  waiting:      'ממתין',
  completed:    'הושלם',
  cancelled:    'בוטל',
};

const PAGE_SIZES = [10, 25, 50];

// ─── Component ───────────────────────────────────────────────

export default function TaskTable({ tasks, onEdit, onDelete }: Props) {
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>('all');
  const [sortKey, setSortKey]         = useState<SortKey>('task_name');
  const [sortDir, setSortDir]         = useState<SortDir>('asc');
  const [page, setPage]               = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Filter + sort
  const filtered = useMemo(() => {
    let list = tasks;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(t =>
        t.task_name.toLowerCase().includes(q) ||
        (t.supplier_name ?? '').toLowerCase().includes(q) ||
        (t.notes ?? '').toLowerCase().includes(q),
      );
    }
    if (statusFilter !== 'all') list = list.filter(t => t.status === statusFilter);
    if (categoryFilter !== 'all') list = list.filter(t => t.category === categoryFilter);

    return [...list].sort((a, b) => {
      let av: string | number = '', bv: string | number = '';
      if (sortKey === 'task_name')     { av = a.task_name.toLowerCase(); bv = b.task_name.toLowerCase(); }
      if (sortKey === 'supplier_name') { av = (a.supplier_name ?? '').toLowerCase(); bv = (b.supplier_name ?? '').toLowerCase(); }
      if (sortKey === 'category')      { av = a.category; bv = b.category; }
      if (sortKey === 'status')        { av = a.status;   bv = b.status; }
      if (sortKey === 'total_amount')  { av = Number(a.total_amount); bv = Number(b.total_amount); }
      if (sortKey === 'due_date')      { av = a.due_date ?? '9999'; bv = b.due_date ?? '9999'; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
  }, [tasks, search, statusFilter, categoryFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated  = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  }

  function handleSearch(v: string) { setSearch(v); setPage(1); }
  function handleStatus(v: TaskStatus | 'all') { setStatusFilter(v); setPage(1); }
  function handleCategory(v: TaskCategory | 'all') { setCategoryFilter(v); setPage(1); }

  function getCategoryLabel(cat: TaskCategory) {
    const opt = CATEGORY_OPTIONS.find(o => o.value === cat);
    return opt ? `${opt.icon} ${opt.label}` : cat;
  }

  const SortCell = ({ colKey, label }: { colKey: SortKey; label: string }) => (
    <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'rgba(201,168,76,0.08)' }}>
      <TableSortLabel
        active={sortKey === colKey}
        direction={sortKey === colKey ? sortDir : 'asc'}
        onClick={() => handleSort(colKey)}
      >
        {label}
      </TableSortLabel>
    </TableCell>
  );

  return (
    <Box>
      {/* ─── Filters ─────────────────── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          placeholder="חיפוש לפי שם, ספק, הערות..."
          size="small"
          value={search}
          onChange={e => handleSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ minWidth: 220, flex: 1 }}
        />
        <TextField
          select
          size="small"
          value={statusFilter}
          onChange={e => handleStatus(e.target.value as TaskStatus | 'all')}
          sx={{ minWidth: 150 }}
          label="סטטוס"
        >
          <MenuItem value="all">כל הסטטוסים</MenuItem>
          {STATUS_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
        <TextField
          select
          size="small"
          value={categoryFilter}
          onChange={e => handleCategory(e.target.value as TaskCategory | 'all')}
          sx={{ minWidth: 150 }}
          label="קטגוריה"
        >
          <MenuItem value="all">כל הקטגוריות</MenuItem>
          {CATEGORY_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.icon} {o.label}</MenuItem>)}
        </TextField>
        <TextField
          select
          size="small"
          value={rowsPerPage}
          onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
          sx={{ minWidth: 100 }}
          label="שורות"
        >
          {PAGE_SIZES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
      </Stack>

      {/* ─── Table ───────────────────── */}
      <TableContainer
        sx={{
          borderRadius: 3,
          boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
          border: '1px solid rgba(201,168,76,0.15)',
          '& .MuiTableCell-root': { fontSize: '0.85rem' },
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <SortCell colKey="task_name"    label="שם המשימה" />
              <SortCell colKey="supplier_name" label="ספק" />
              <SortCell colKey="category"     label="קטגוריה" />
              <SortCell colKey="status"       label="סטטוס" />
              <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'rgba(201,168,76,0.08)' }}>מקדמה</TableCell>
              <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'rgba(201,168,76,0.08)' }}>שולם</TableCell>
              <SortCell colKey="total_amount" label="סה״כ" />
              <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'rgba(201,168,76,0.08)' }}>נותר</TableCell>
              <SortCell colKey="due_date"     label="תאריך יעד" />
              <TableCell sx={{ fontWeight: 700, bgcolor: 'rgba(201,168,76,0.08)' }}>הערות</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: 'rgba(201,168,76,0.08)', whiteSpace: 'nowrap' }}>טלפון ספק</TableCell>
              <TableCell sx={{ fontWeight: 700, bgcolor: 'rgba(201,168,76,0.08)' }}>פעולות</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            <AnimatePresence initial={false}>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12}>
                    <Box
                      component={motion.div}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}
                    >
                      <AssignmentIcon sx={{ fontSize: 48, opacity: 0.25, mb: 1 }} />
                      <Typography variant="body2" sx={{ opacity: 0.6 }}>
                        {search || statusFilter !== 'all' || categoryFilter !== 'all'
                          ? 'לא נמצאו משימות התואמות את החיפוש'
                          : 'עדיין אין משימות — לחץ על + להוספה'}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map(task => {
                  const remaining = Number(task.total_amount) - Number(task.paid_amount);
                  return (
                    <motion.tr
                      key={task.id}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12, height: 0 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                      style={{ display: 'table-row' }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 160 }}>
                          {task.task_name}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', maxWidth: 120 }}>
                        <Typography variant="body2" noWrap>{task.supplier_name ?? '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap>{getCategoryLabel(task.category)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={STATUS_LABEL[task.status]}
                          color={STATUS_COLOR[task.status]}
                          size="small"
                          sx={{ fontWeight: 600, fontSize: '0.73rem' }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{fmtMoney(Number(task.deposit))}</TableCell>
                      <TableCell sx={{ color: '#2e7d32', fontWeight: 600 }}>{fmtMoney(Number(task.paid_amount))}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{fmtMoney(Number(task.total_amount))}</TableCell>
                      <TableCell sx={{ color: remaining > 0 ? '#c62828' : '#2e7d32', fontWeight: 600 }}>
                        {fmtMoney(remaining)}
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                        {fmtDate(task.due_date)}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 140 }}>
                        <Typography variant="body2" noWrap color="text.secondary" title={task.notes ?? ''}>
                          {task.notes ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {task.phone ? (
                          <Tooltip title={`התקשר ל-${task.phone}`}>
                            <IconButton
                              size="small"
                              component="a"
                              href={`tel:${task.phone}`}
                              sx={{ color: 'primary.main', gap: 0.5 }}
                              aria-label={`התקשר ל-${task.phone}`}
                            >
                              <PhoneIcon fontSize="small" />
                              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                {task.phone}
                              </Typography>
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Typography variant="body2" color="text.secondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="עריכה">
                            <IconButton size="small" onClick={() => onEdit(task)} sx={{ color: 'primary.main' }}>
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="מחיקה">
                            <IconButton size="small" onClick={() => onDelete(task)} sx={{ color: 'error.main' }}>
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </motion.tr>
                  );
                })
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </TableContainer>

      {/* ─── Pagination ──────────────── */}
      {filtered.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            מציג {((page - 1) * rowsPerPage) + 1}–{Math.min(page * rowsPerPage, filtered.length)} מתוך {filtered.length} משימות
          </Typography>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, v) => setPage(v)}
            size="small"
            shape="rounded"
            sx={{ '& .MuiPaginationItem-root': { fontWeight: 600 } }}
          />
        </Box>
      )}
    </Box>
  );
}
