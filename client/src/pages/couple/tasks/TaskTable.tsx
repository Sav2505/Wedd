import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Checkbox,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  ListItemText,
  MenuItem,
  Pagination,
  Select,
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

function fmtTotalMoney(n: number) {
  return `₪${Number(n).toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Types ────────────────────────────────────────────────────

type SortKey = 'task_name' | 'supplier_name' | 'category' | 'status' | 'deposit' | 'paid_amount' | 'remaining' | 'due_date' | 'notes' | 'phone';
type SortDir = 'asc' | 'desc';
type FilterKey = 'task_name' | 'supplier_name' | 'deposit' | 'paid_amount' | 'total_amount' | 'remaining' | 'due_date' | 'notes' | 'phone';
type ColumnFilterKey = FilterKey | 'category' | 'status';
type ColumnKey = 'task_name' | 'supplier_name' | 'category' | 'status' | 'deposit' | 'paid_amount' | 'total_amount' | 'remaining' | 'due_date' | 'notes' | 'phone' | 'actions';

interface Props {
  tasks: WeddingTask[];
  onEdit: (task: WeddingTask) => void;
  onDelete: (task: WeddingTask) => void;
}

const STATUS_COLOR: Record<TaskStatus, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  not_started: 'default',
  in_progress: 'info',
  waiting: 'warning',
  completed: 'success',
  cancelled: 'error',
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  not_started: 'טרם התחיל',
  in_progress: 'בתהליך',
  waiting: 'ממתין',
  completed: 'הושלם',
  cancelled: 'בוטל',
};

const PAGE_SIZES = [10, 25, 50];
const COLUMN_OPTIONS: { key: ColumnKey; label: string }[] = [
  { key: 'task_name', label: 'שם המשימה' },
  { key: 'supplier_name', label: 'ספק' },
  { key: 'category', label: 'קטגוריה' },
  { key: 'status', label: 'סטטוס' },
  { key: 'deposit', label: 'מקדמה' },
  { key: 'paid_amount', label: 'שולם' },
  { key: 'total_amount', label: 'סה״כ' },
  { key: 'remaining', label: 'נותר' },
  { key: 'due_date', label: 'תאריך יעד' },
  { key: 'notes', label: 'הערות' },
  { key: 'phone', label: 'טלפון ספק' },
  { key: 'actions', label: 'פעולות' },
];
const COLUMN_STORAGE_KEY = 'wedding.tasks.table.visibleColumns';

function readVisibleColumns(): ColumnKey[] {
  const allColumns = COLUMN_OPTIONS.map(column => column.key);
  if (typeof window === 'undefined') return allColumns;

  try {
    const stored = window.localStorage.getItem(COLUMN_STORAGE_KEY);
    if (!stored) return allColumns;
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return allColumns;
    if (parsed.length === 0) return [];

    const selected = allColumns.filter(key => parsed.includes(key));
    return selected.length > 0 ? selected : allColumns;
  } catch {
    return allColumns;
  }
}

// ─── Component ───────────────────────────────────────────────

export default function TaskTable({ tasks, onEdit, onDelete }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus[]>(STATUS_OPTIONS.map(option => option.value));
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory[]>(CATEGORY_OPTIONS.map(option => option.value));
  const [sortKey, setSortKey] = useState<SortKey>('task_name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(PAGE_SIZES[1]);
  const [openNotes, setOpenNotes] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(readVisibleColumns);
  const [columnFilters, setColumnFilters] = useState<Record<FilterKey, string>>({
    task_name: '', supplier_name: '', deposit: '', paid_amount: '',
    total_amount: '', remaining: '', due_date: '', notes: '', phone: '',
  });
  const orderedVisibleColumns = COLUMN_OPTIONS
    .map(column => column.key)
    .filter(key => visibleColumns.includes(key));
  const summaryLabelColumn = orderedVisibleColumns.find(key =>
    key !== 'deposit' && key !== 'paid_amount' && key !== 'total_amount' && key !== 'remaining',
  ) ?? orderedVisibleColumns[0];

  useEffect(() => {
    try {
      window.localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns));
    } catch {
      // Ignore unavailable storage; column selection still works for this session.
    }
  }, [visibleColumns]);

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
    list = list.filter(task => categoryFilter.includes(task.category));
    list = list.filter(task => statusFilter.includes(task.status));
    list = list.filter(task => {
      const values: Record<FilterKey, string> = {
        task_name: task.task_name,
        supplier_name: task.supplier_name ?? '',
        deposit: String(Number(task.deposit)),
        paid_amount: String(Number(task.paid_amount)),
        total_amount: String(Number(task.total_amount)),
        remaining: String(Number(task.total_amount) - Number(task.paid_amount)),
        due_date: task.due_date ?? '',
        notes: task.notes ?? '',
        phone: task.phone ?? '',
      };
      return (Object.entries(columnFilters) as [FilterKey, string][]).every(([key, value]) =>
        !value.trim() || values[key].toLowerCase().includes(value.trim().toLowerCase()),
      );
    });

    return [...list].sort((a, b) => {
      let av: string | number = '', bv: string | number = '';
      if (sortKey === 'task_name') { av = a.task_name.toLowerCase(); bv = b.task_name.toLowerCase(); }
      if (sortKey === 'supplier_name') { av = (a.supplier_name ?? '').toLowerCase(); bv = (b.supplier_name ?? '').toLowerCase(); }
      if (sortKey === 'category') { av = a.category; bv = b.category; }
      if (sortKey === 'status') { av = a.status; bv = b.status; }
      if (sortKey === 'deposit') { av = Number(a.deposit); bv = Number(b.deposit); }
      if (sortKey === 'paid_amount') { av = Number(a.paid_amount); bv = Number(b.paid_amount); }
      if (sortKey === 'remaining') { av = Number(a.total_amount) - Number(a.paid_amount); bv = Number(b.total_amount) - Number(b.paid_amount); }
      if (sortKey === 'due_date') { av = a.due_date ?? '9999'; bv = b.due_date ?? '9999'; }
      if (sortKey === 'notes') { av = (a.notes ?? '').toLowerCase(); bv = (b.notes ?? '').toLowerCase(); }
      if (sortKey === 'phone') { av = (a.phone ?? '').toLowerCase(); bv = (b.phone ?? '').toLowerCase(); }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tasks, search, categoryFilter, statusFilter, columnFilters, sortKey, sortDir]);

  const totals = useMemo(() => filtered.reduce((sum, task) => ({
    deposit: sum.deposit + Number(task.deposit),
    paid: sum.paid + Number(task.paid_amount),
    total: sum.total + Number(task.total_amount),
    remaining: sum.remaining + Number(task.total_amount) - Number(task.paid_amount),
  }), { deposit: 0, paid: 0, total: 0, remaining: 0 }), [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  }

  function handleSearch(v: string) { setSearch(v); setPage(1); }
  function handleColumnFilter(key: FilterKey, value: string) {
    setColumnFilters(current => ({ ...current, [key]: value }));
    setPage(1);
  }
  function handleMultiFilter(key: 'category' | 'status', value: string[]) {
    if (value.includes('__all__')) {
      if (key === 'category') {
        setCategoryFilter(current => current.length === CATEGORY_OPTIONS.length ? [] : CATEGORY_OPTIONS.map(option => option.value));
      } else {
        setStatusFilter(current => current.length === STATUS_OPTIONS.length ? [] : STATUS_OPTIONS.map(option => option.value));
      }
      setPage(1);
      return;
    }
    if (key === 'category') setCategoryFilter(value as TaskCategory[]);
    else setStatusFilter(value as TaskStatus[]);
    setPage(1);
  }
  function handleVisibleColumnsChange(value: string[]) {
    if (value.includes('__all__')) {
      setVisibleColumns(current => current.length === COLUMN_OPTIONS.length
        ? []
        : COLUMN_OPTIONS.map(column => column.key));
      return;
    }

    const selected = COLUMN_OPTIONS
      .map(column => column.key)
      .filter(key => value.includes(key));
    setVisibleColumns(selected);
  }

  function getCategoryLabel(cat: TaskCategory) {
    const opt = CATEGORY_OPTIONS.find(o => o.value === cat);
    return opt ? `${opt.icon} ${opt.label}` : cat;
  }

  const renderSortCell = (colKey: SortKey, label: string) => (
    <TableCell sx={{
      display: visibleColumns.includes(colKey) ? 'table-cell' : 'none',
      fontWeight: 700,
      whiteSpace: 'nowrap',
      bgcolor: 'rgba(201,168,76,0.08)',
    }}>
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
          value={rowsPerPage}
          onChange={e => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
          sx={{ minWidth: 100 }}
          label="שורות בעמוד"
        >
          {PAGE_SIZES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel id="task-visible-columns-label">עמודות להצגה</InputLabel>
          <Select
            labelId="task-visible-columns-label"
            multiple
            value={visibleColumns}
            label="עמודות להצגה"
            onChange={event => handleVisibleColumnsChange(event.target.value as string[])}
            renderValue={selected => selected.length === COLUMN_OPTIONS.length
              ? 'כל העמודות'
              : selected.length === 0 ? 'ללא עמודות' : `${selected.length} עמודות`}
          >
            <MenuItem value="__all__">
              <Checkbox checked={visibleColumns.length === COLUMN_OPTIONS.length} />
              <ListItemText primary="בחר הכל" />
            </MenuItem>
            {COLUMN_OPTIONS.map(column => (
              <MenuItem
                key={column.key}
                value={column.key}
              >
                <Checkbox checked={visibleColumns.includes(column.key)} />
                <ListItemText primary={column.label} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {/* ─── Table ───────────────────── */}
      <TableContainer
        sx={{
          borderRadius: 1.5,
          backgroundColor: "rgba(255, 255, 255, 0.2)",
          boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
          border: '1px solid rgba(201,168,76,0.25)',
          '& .MuiTableCell-root': { fontSize: '0.85rem' },
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {renderSortCell('task_name', 'שם המשימה')}
              {renderSortCell('supplier_name', 'ספק')}
              {renderSortCell('category', 'קטגוריה')}
              {renderSortCell('status', 'סטטוס')}
              {renderSortCell('deposit', 'מקדמה')}
              {renderSortCell('paid_amount', 'שולם')}
              <TableCell sx={{ display: visibleColumns.includes('total_amount') ? 'table-cell' : 'none', fontWeight: 700, whiteSpace: 'nowrap', bgcolor: 'rgba(201,168,76,0.08)' }}>סה״כ</TableCell>
              {renderSortCell('remaining', 'נותר')}
              {renderSortCell('due_date', 'תאריך יעד')}
              {renderSortCell('notes', 'הערות')}
              {renderSortCell('phone', 'טלפון ספק')}
              <TableCell sx={{ display: visibleColumns.includes('actions') ? 'table-cell' : 'none', fontWeight: 700, bgcolor: 'rgba(201,168,76,0.08)' }}>פעולות</TableCell>
            </TableRow>
            <TableRow>
              {([
                ['task_name', 'סינון'], ['supplier_name', 'סינון'], ['category', 'קטגוריה'], ['status', 'סטטוס'],
                ['deposit', 'סינון'], ['paid_amount', 'סינון'], ['total_amount', 'סינון'], ['remaining', 'סינון'],
                ['due_date', 'YYYY-MM-DD'], ['notes', 'סינון'], ['phone', 'סינון'],
              ] as [ColumnFilterKey, string][]).map(([key, placeholder]) => (
                <TableCell key={key} sx={{ display: visibleColumns.includes(key) ? 'table-cell' : 'none', p: 0.75, bgcolor: 'background.paper' }}>
                  {key === 'category' || key === 'status' ? (() => {
                    const selectedValues = key === 'category' ? categoryFilter : statusFilter;
                    const options = key === 'category' ? CATEGORY_OPTIONS : STATUS_OPTIONS;
                    const allSelected = selectedValues.length === options.length;
                    return (
                      <FormControl size="small" sx={{ minWidth: 115 }}>
                        <Select
                          multiple
                          displayEmpty
                          value={selectedValues}
                          onChange={event => handleMultiFilter(key, event.target.value as string[])}
                          renderValue={selected => selected.length === options.length
                            ? 'הכל'
                            : selected.length === 0 ? 'לא נבחרו' : `${selected.length} נבחרו`}
                          inputProps={{ 'aria-label': `סינון לפי ${key === 'category' ? 'קטגוריה' : 'סטטוס'}` }}
                          sx={{ '& .MuiSelect-select': { py: 0.75, fontSize: '0.75rem' } }}
                        >
                          <MenuItem value="__all__">
                            <Checkbox checked={allSelected} />
                            <ListItemText primary="בחר הכל" />
                          </MenuItem>
                          {key === 'category'
                            ? CATEGORY_OPTIONS.map(option => (
                              <MenuItem key={option.value} value={option.value}>
                                <Checkbox checked={categoryFilter.includes(option.value)} />
                                <ListItemText primary={`${option.icon} ${option.label}`} />
                              </MenuItem>
                            ))
                            : STATUS_OPTIONS.map(option => (
                              <MenuItem key={option.value} value={option.value}>
                                <Checkbox checked={statusFilter.includes(option.value)} />
                                <ListItemText primary={option.label} />
                              </MenuItem>
                            ))}
                        </Select>
                      </FormControl>
                    );
                  })() : (
                    <TextField
                      size="small"
                      value={columnFilters[key]}
                      onChange={event => handleColumnFilter(key, event.target.value)}
                      placeholder={placeholder}
                      inputProps={{ 'aria-label': `סינון לפי ${placeholder === 'סינון' ? key : placeholder}` }}
                      sx={{ minWidth: key === 'due_date' ? 120 : 90, '& .MuiInputBase-input': { py: 0.75, fontSize: '0.75rem' } }}
                    />
                  )}
                </TableCell>
              ))}
              <TableCell sx={{ display: visibleColumns.includes('actions') ? 'table-cell' : 'none', bgcolor: 'background.paper' }} />
            </TableRow>
          </TableHead>

          <TableBody>
            {orderedVisibleColumns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={1}>
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                    לא נבחרו עמודות להצגה
                  </Typography>
                </TableCell>
              </TableRow>
            ) : <AnimatePresence initial={false}>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={Math.max(visibleColumns.length, 1)}>
                    <Box
                      component={motion.div}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}
                    >
                      <AssignmentIcon sx={{ fontSize: 48, opacity: 0.25, mb: 1 }} />
                      <Typography variant="body2" sx={{ opacity: 0.6 }}>
                        {search || Object.values(columnFilters).some(Boolean) ||
                          categoryFilter.length < CATEGORY_OPTIONS.length ||
                          statusFilter.length < STATUS_OPTIONS.length
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
                      <TableCell sx={{ display: visibleColumns.includes('task_name') ? 'table-cell' : 'none' }}>
                        <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 160 }}>
                          {task.task_name}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ display: visibleColumns.includes('supplier_name') ? 'table-cell' : 'none', color: 'text.secondary', maxWidth: 120 }}>
                        <Typography variant="body2" noWrap>{task.supplier_name ?? '—'}</Typography>
                      </TableCell>
                      <TableCell sx={{ display: visibleColumns.includes('category') ? 'table-cell' : 'none' }}>
                        <Typography variant="body2" noWrap>{getCategoryLabel(task.category)}</Typography>
                      </TableCell>
                      <TableCell sx={{ display: visibleColumns.includes('status') ? 'table-cell' : 'none' }}>
                        <Chip
                          label={STATUS_LABEL[task.status]}
                          color={STATUS_COLOR[task.status]}
                          size="small"
                          sx={{ fontWeight: 600, fontSize: '0.73rem' }}
                        />
                      </TableCell>
                      <TableCell sx={{ display: visibleColumns.includes('deposit') ? 'table-cell' : 'none', color: 'text.secondary' }}>{fmtMoney(Number(task.deposit))}</TableCell>
                      <TableCell sx={{ display: visibleColumns.includes('paid_amount') ? 'table-cell' : 'none', color: '#2e7d32', fontWeight: 600 }}>{fmtMoney(Number(task.paid_amount))}</TableCell>
                      <TableCell sx={{ display: visibleColumns.includes('total_amount') ? 'table-cell' : 'none', fontWeight: 700 }}>{fmtMoney(Number(task.total_amount))}</TableCell>
                      <TableCell sx={{ display: visibleColumns.includes('remaining') ? 'table-cell' : 'none', color: remaining > 0 ? '#c62828' : '#2e7d32', fontWeight: 600 }}>
                        {fmtMoney(remaining)}
                      </TableCell>
                      <TableCell sx={{ display: visibleColumns.includes('due_date') ? 'table-cell' : 'none', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                        {fmtDate(task.due_date)}
                      </TableCell>
                      <TableCell sx={{ display: visibleColumns.includes('notes') ? 'table-cell' : 'none', maxWidth: 140 }}>
                        {task.notes ? (
                          <Typography
                            variant="body2"
                            noWrap
                            color="text.secondary"
                            onClick={() => setOpenNotes(task.notes)}
                            sx={{
                              cursor: 'pointer',
                              maxWidth: 140,
                              transition: "all 0.2s ease-in-out",
                              '&:hover': {
                                color: 'primary.main',
                              },
                            }}
                          >
                            {task.notes}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ display: visibleColumns.includes('phone') ? 'table-cell' : 'none', whiteSpace: 'nowrap' }}>
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
                      <TableCell sx={{ display: visibleColumns.includes('actions') ? 'table-cell' : 'none' }}>
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
            </AnimatePresence>}
          </TableBody>
          {orderedVisibleColumns.length > 0 && <TableBody>
            <TableRow sx={{
              '& .MuiTableCell-root': {
                fontWeight: 800,
                bgcolor: 'rgba(201,168,76,0.18)',
                borderTop: '2px solid rgba(201,168,76,0.65)',
                whiteSpace: 'nowrap',
              },
            }}>
              {orderedVisibleColumns.map(key => {
                const isMoneyColumn = key === 'deposit' || key === 'paid_amount' || key === 'total_amount' || key === 'remaining';
                const amount = key === 'deposit' ? totals.deposit
                  : key === 'paid_amount' ? totals.paid
                    : key === 'total_amount' ? totals.total
                      : key === 'remaining' ? totals.remaining
                        : null;
                return (
                  <TableCell key={key}>
                    {key === summaryLabelColumn && !isMoneyColumn && `סיכום (${filtered.length} משימות)`}
                    {isMoneyColumn && (
                      <>
                        {key === summaryLabelColumn && <Typography variant="caption" display="block">סיכום ({filtered.length} משימות)</Typography>}
                        {fmtTotalMoney(amount ?? 0)}
                      </>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableBody>
          }
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
      <Dialog
        open={openNotes !== null}
        onClose={() => setOpenNotes(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle>
          הערות
        </DialogTitle>

        <DialogContent dividers>
          <Typography
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: 1.8,
            }}
          >
            {openNotes}
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenNotes(null)}>
            סגור
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
