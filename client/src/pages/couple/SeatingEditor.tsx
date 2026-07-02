import { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, IconButton, TextField, Chip,
    CircularProgress, Alert, Autocomplete, Dialog,
    DialogTitle, DialogContent, DialogActions,
    Tooltip, Divider, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseIcon from '@mui/icons-material/Close';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import TableRowsIcon from '@mui/icons-material/TableRows';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { motion, AnimatePresence } from 'framer-motion';

import FloorPlanCanvas from '../../components/FloorPlanCanvas';
import { WeddingTableWithGuests } from '../../types/domain';
import { getWeddingInfo, updateWeddingInfo } from '../../services/info.service';
import {
    getAllTables,
    createTable,
    updateTable,
    updateTablePosition,
    deleteTable,
    assignGuest,
    unassignGuest,
    getUnassignedGuests,
} from '../../services/tables.service';

const STAGE_LABEL_STORAGE_KEY = 'wedding.floorPlan.stageLabel';
const ENTRANCE_POSITION_STORAGE_KEY = 'wedding.floorPlan.entrancePosition';

// ─── Types ───────────────────────────────────────────────────

interface UnassignedGuest {
    id: string;
    full_name: string;
    side: string | null;
    plus_count: number;
}

// ─── Component ───────────────────────────────────────────────

export default function SeatingEditor() {
    const [tables, setTables] = useState<WeddingTableWithGuests[]>([]);
    const [unassigned, setUnassigned] = useState<UnassignedGuest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSavingLabel, setIsSavingLabel] = useState(false);
    const [labelSaved, setLabelSaved] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    // ── "Add table" dialog local state ──
    const [newNum, setNewNum] = useState('');
    const [newCap, setNewCap] = useState(10);
    const [newLabel, setNewLabel] = useState('');
    const [newShape, setNewShape] = useState<'round' | 'square' | 'rect'>('round');
    const [newOrientation, setNewOrientation] = useState<'h' | 'v'>('h');
    const [stageLabel, setStageLabel] = useState(() => {
        if (typeof window === 'undefined') return 'חופה';
        const stored = window.localStorage.getItem(STAGE_LABEL_STORAGE_KEY);
        return stored?.trim() ? stored : 'חופה';
    });
    const [entrancePosition, setEntrancePosition] = useState<'right' | 'bottom' | 'left'>(() => {
        if (typeof window === 'undefined') return 'bottom';
        const stored = window.localStorage.getItem(ENTRANCE_POSITION_STORAGE_KEY);
        return stored === 'right' || stored === 'left' || stored === 'bottom' ? stored : 'bottom';
    });

    // ── Editable copy of selected table fields ──
    const [editLabel, setEditLabel] = useState('');
    const [editCap, setEditCap] = useState(10);
    const [guestToAdd, setGuestToAdd] = useState<UnassignedGuest | null>(null);

    // ── Load data ─────────────────────────────────────────────

    const reload = useCallback(async () => {
        try {
            const [t, u] = await Promise.all([getAllTables(), getUnassignedGuests()]);
            setTables(t);
            setUnassigned(u);
        } catch {
            setError('שגיאה בטעינת נתונים');
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            await reload();
            try {
                const info = await getWeddingInfo();
                if (info.stage_label?.trim()) {
                    setStageLabel(info.stage_label);
                    window.localStorage.setItem(STAGE_LABEL_STORAGE_KEY, info.stage_label);
                }
            } catch { /* non-critical, localStorage fallback already set */ }
        };
        init().finally(() => setLoading(false));
    }, [reload]);

    // ── Sync edit fields when selection changes ───────────────

    useEffect(() => {
        const t = tables.find(t => t.id === selectedId);
        if (t) {
            setEditLabel(t.label ?? '');
            setEditCap(t.capacity);
        }
    }, [selectedId, tables]);

    // ── Helpers ───────────────────────────────────────────────

    const selectedTable = tables.find(t => t.id === selectedId) ?? null;

    function nextTableNumber(): number {
        const used = new Set(tables.map(t => t.table_number));
        let n = 1;
        while (used.has(n)) n++;
        return n;
    }

    function openAddDialog() {
        setNewNum(String(nextTableNumber()));
        setNewCap(10);
        setNewLabel('');
        setNewShape('round');
        setNewOrientation('h');
        setAddDialogOpen(true);
    }

    function handleStageLabelChange(value: string) {
        setStageLabel(value);
        setLabelSaved(false);
    }

    async function handleSaveStageLabelToServer() {
        setIsSavingLabel(true);
        try {
            await updateWeddingInfo({ stage_label: stageLabel.trim() || 'חופה' });
            window.localStorage.setItem(STAGE_LABEL_STORAGE_KEY, stageLabel.trim() || 'חופה');
            setLabelSaved(true);
            setTimeout(() => setLabelSaved(false), 2500);
        } catch {
            setError('שגיאה בשמירת הכיתוב');
        } finally {
            setIsSavingLabel(false);
        }
    }

    function handleEntrancePositionChange(value: 'right' | 'bottom' | 'left') {
        setEntrancePosition(value);
        if (typeof window === 'undefined') return;
        window.localStorage.setItem(ENTRANCE_POSITION_STORAGE_KEY, value);
    }

    // ── Drag end → save position ──────────────────────────────

    async function handleDragEnd(id: string, posX: number, posY: number) {
        // Guard: never send NaN/Infinity to the server
        if (!Number.isFinite(posX) || !Number.isFinite(posY)) return;
        setTables(prev => prev.map(t => t.id === id ? { ...t, pos_x: posX, pos_y: posY } : t));
        try {
            await updateTablePosition(id, posX, posY);
        } catch {
            await reload();
        }
    }

    // ── Add table ─────────────────────────────────────────────

    async function handleAddTable() {
        const num = parseInt(newNum, 10);
        if (!num || num < 1) return;
        setIsSaving(true);
        try {
            // Spread new tables evenly — place at a random free-ish spot
            const angle = (tables.length * 137.5) % 360;  // golden angle distribution
            const radius = 30;
            const posX = Math.round(clamp(50 + radius * Math.cos((angle * Math.PI) / 180), 10, 90));
            const posY = Math.round(clamp(50 + radius * 0.6 * Math.sin((angle * Math.PI) / 180), 20, 80));

            const newTable = await createTable({
                table_number: num,
                label: newLabel.trim() || undefined,
                capacity: newCap,
                shape: newShape,
                orientation: newShape === 'rect' ? newOrientation : undefined,
                pos_x: posX,
                pos_y: posY,
            });
            setTables(prev => [...prev, newTable]);
            setSelectedId(newTable.id);
            setAddDialogOpen(false);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'שגיאה ביצירת שולחן';
            setError(msg);
        } finally {
            setIsSaving(false);
        }
    }

    // ── Save label / capacity ─────────────────────────────────

    async function handleSaveDetails() {
        if (!selectedId) return;
        setIsSaving(true);
        try {
            await updateTable(selectedId, { label: editLabel.trim() || null, capacity: editCap });
            setTables(prev => prev.map(t =>
                t.id === selectedId ? { ...t, label: editLabel.trim() || null, capacity: editCap } : t,
            ));
        } catch {
            setError('שגיאה בשמירת פרטי שולחן');
        } finally {
            setIsSaving(false);
        }
    }

    // ── Change shape (auto-saves) ─────────────────────────────

    async function handleShapeChange(_e: React.MouseEvent, shape: 'round' | 'square' | 'rect' | null) {
        if (!selectedId || !shape) return;
        const orientation = shape === 'rect'
            ? (tables.find(t => t.id === selectedId)?.orientation ?? 'h')
            : null;
        setTables(prev => prev.map(t => t.id === selectedId ? { ...t, shape, orientation } : t));
        try {
            await updateTable(selectedId, { shape, orientation });
        } catch {
            setError('שגיאה בשינוי צורת השולחן');
            await reload();
        }
    }

    async function handleOrientationChange(_e: React.MouseEvent, orientation: 'h' | 'v' | null) {
        if (!selectedId || !orientation) return;
        setTables(prev => prev.map(t => t.id === selectedId ? { ...t, orientation } : t));
        try {
            await updateTable(selectedId, { orientation });
        } catch {
            setError('שגיאה בשינוי כיוון השולחן');
            await reload();
        }
    }

    // ── Assign guest ──────────────────────────────────────────

    async function handleAssignGuest() {
        if (!selectedId || !guestToAdd) return;
        setIsSaving(true);
        try {
            await assignGuest(selectedId, guestToAdd.id);
            setGuestToAdd(null);
            await reload();
        } catch {
            setError('שגיאה בשיבוץ אורח');
        } finally {
            setIsSaving(false);
        }
    }

    // ── Unassign guest ────────────────────────────────────────

    async function handleUnassignGuest(guestId: string) {
        setIsSaving(true);
        try {
            await unassignGuest(guestId);
            await reload();
        } catch {
            setError('שגיאה בהסרת אורח');
        } finally {
            setIsSaving(false);
        }
    }

    // ── Delete table ──────────────────────────────────────────

    async function handleDeleteTable() {
        if (!deleteConfirmId) return;
        setIsSaving(true);
        try {
            await deleteTable(deleteConfirmId);
            setTables(prev => prev.filter(t => t.id !== deleteConfirmId));
            if (selectedId === deleteConfirmId) setSelectedId(null);
            setDeleteConfirmId(null);
            await reload();
        } catch {
            setError('שגיאה במחיקת שולחן');
        } finally {
            setIsSaving(false);
        }
    }

    // ── Render ────────────────────────────────────────────────

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6 }}>
                <CircularProgress sx={{ color: '#C9A84C' }} />
            </Box>
        );
    }

    const totalGuests = tables.reduce((s, t) => s + t.guests.reduce((gs, g) => gs + 1 + (g.plus_count ?? 0), 0), 0);
    const unassignedCount = unassigned.reduce((s, g) => s + 1 + (g.plus_count ?? 0), 0);

    return (
        <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
            {error && (
                <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: 2 }}>
                    {error}
                </Alert>
            )}

            {/* ── Toolbar ─────────────────────────────────────── */}
            <Box sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                mb: 2, flexWrap: 'wrap', gap: 1,
            }}>
                <Box>
                    <Typography variant="h6" sx={{
                        fontFamily: "'Frank Ruhl Libre', serif",
                        fontWeight: 700, color: '#2C1810',
                    }}>
                        עריכת סידור הושבה
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#A08070' }}>
                        {tables.length} שולחנות · {totalGuests} מוזמנים משובצים
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {unassignedCount > 0 && (
                        <Chip
                            icon={<PeopleOutlineIcon sx={{ fontSize: 16 }} />}
                            label={`${unassignedCount} ללא שולחן`}
                            size="small"
                            sx={{ background: 'rgba(220,80,80,0.1)', color: '#B03030', border: '1px solid rgba(220,80,80,0.25)', fontWeight: 600 }}
                        />
                    )}
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={openAddDialog}
                        size="small"
                        sx={{
                            background: 'linear-gradient(135deg, #E0C97A, #C9A84C)',
                            color: '#2C1810',
                            fontWeight: 700,
                            borderRadius: 2,
                            boxShadow: '0 3px 10px rgba(201,168,76,0.35)',
                            '&:hover': { background: 'linear-gradient(135deg, #E8D490, #D4A855)' },
                        }}
                    >
                        הוסף שולחן
                    </Button>
                </Box>
            </Box>

            {/* ── Floor Plan ─────────────────────────────────── */}
            <Box sx={{ mb: 2, mt: 3, display: 'flex', justifyContent: 'flex-start', gap: 1.25, flexWrap: 'wrap', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <TextField
                        label="כיתוב על האזור העליון"
                        value={stageLabel}
                        onChange={(e) => handleStageLabelChange(e.target.value)}
                        size="small"
                        placeholder="למשל: חופה / במה / בר"
                        inputProps={{ maxLength: 30 }}
                        sx={{ width: { xs: 210, sm: 240 } }}
                    />
                    <Tooltip title={labelSaved ? 'נשמר!' : 'שמור כיתוב'}>
                        <span>
                            <IconButton
                                onClick={handleSaveStageLabelToServer}
                                disabled={isSavingLabel}
                                size="small"
                                sx={{
                                    color: labelSaved ? '#4caf50' : '#9A7833',
                                    border: '1px solid',
                                    borderColor: labelSaved ? 'rgba(76,175,80,0.45)' : 'rgba(201,168,76,0.45)',
                                    borderRadius: 1.5,
                                    p: 0.65,
                                    transition: 'all 0.25s',
                                    '&:hover': { background: 'rgba(201,168,76,0.12)' },
                                }}
                            >
                                {isSavingLabel
                                    ? <CircularProgress size={16} sx={{ color: '#C9A84C' }} />
                                    : labelSaved
                                        ? <CheckCircleOutlineIcon sx={{ fontSize: 18 }} />
                                        : <SaveOutlinedIcon sx={{ fontSize: 18 }} />
                                }
                            </IconButton>
                        </span>
                    </Tooltip>
                </Box>

                <ToggleButtonGroup
                    value={entrancePosition}
                    exclusive
                    onChange={(_e, v) => v && handleEntrancePositionChange(v)}
                    size="small"
                    sx={{
                        '& .MuiToggleButton-root': {
                            borderColor: 'rgba(201,168,76,0.35)',
                            color: '#9A7833',
                            minWidth: 66,
                            '&.Mui-selected': {
                                background: 'rgba(201,168,76,0.18)',
                                color: '#2C1810',
                                borderColor: 'rgba(201,168,76,0.6)',
                            },
                        },
                    }}
                >
                    <ToggleButton value="right">ימין</ToggleButton>
                    <ToggleButton value="bottom">למטה</ToggleButton>
                    <ToggleButton value="left">שמאל</ToggleButton>
                </ToggleButtonGroup>
            </Box>

            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
            >
                <FloorPlanCanvas
                    tables={tables}
                    stageLabel={stageLabel}
                    entrancePosition={entrancePosition}
                    editable
                    selectedId={selectedId}
                    onSelectTable={setSelectedId}
                    onDragEnd={handleDragEnd}
                />
            </motion.div>

            <Typography variant="caption" sx={{
                display: 'block', textAlign: 'center', mt: 1, color: 'rgba(154,120,51,0.5)',
            }}>
                גרור שולחנות לסדר אותם · לחץ לבחירה ועריכה
            </Typography>

            {/* ── Selected Table Panel ────────────────────────── */}
            <AnimatePresence>
                {selectedTable && (
                    <motion.div
                        key={selectedTable.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                    >
                        <Box sx={{
                            mt: 2,
                            borderRadius: 3,
                            background: 'linear-gradient(145deg, rgba(253,250,243,0.95), rgba(245,237,217,0.9))',
                            border: '1.5px solid rgba(201,168,76,0.3)',
                            boxShadow: '0 4px 20px rgba(201,168,76,0.12)',
                            overflow: 'hidden',
                        }}>
                            {/* Panel header */}
                            <Box sx={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                px: 2, py: 1.5,
                                background: 'rgba(201,168,76,0.08)',
                                borderBottom: '1px solid rgba(201,168,76,0.2)',
                            }}>
                                <Typography sx={{
                                    fontFamily: "'Frank Ruhl Libre', serif",
                                    fontWeight: 700, color: '#2C1810', fontSize: '1rem',
                                }}>
                                    שולחן {selectedTable.table_number}
                                    {selectedTable.label && (
                                        <Typography component="span" sx={{ fontSize: '0.8rem', color: '#A08070', mr: 1 }}>
                                            {' — '}{selectedTable.label}
                                        </Typography>
                                    )}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    <Tooltip title="מחק שולחן">
                                        <IconButton
                                            size="small"
                                            onClick={() => setDeleteConfirmId(selectedTable.id)}
                                            sx={{ color: '#C04040', '&:hover': { background: 'rgba(192,64,64,0.1)' } }}
                                        >
                                            <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    <IconButton size="small" onClick={() => setSelectedId(null)} sx={{ color: '#A08070' }}>
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </Box>
                            </Box>

                            <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {/* Label + Capacity row */}
                                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                    <TextField
                                        label="שם השולחן (אופציונלי)"
                                        value={editLabel}
                                        onChange={e => setEditLabel(e.target.value)}
                                        size="small"
                                        sx={{ flex: '1 1 160px' }}
                                        inputProps={{ maxLength: 40 }}
                                    />

                                    {/* Capacity stepper */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <Typography variant="body2" sx={{ color: '#A08070', whiteSpace: 'nowrap' }}>
                                            כיסאות:
                                        </Typography>
                                        <IconButton size="small" onClick={() => setEditCap(c => Math.max(1, c - 1))}>
                                            <RemoveCircleOutlineIcon sx={{ fontSize: 20, color: '#C9A84C' }} />
                                        </IconButton>
                                        <Typography sx={{ minWidth: 24, textAlign: 'center', fontWeight: 700, color: '#2C1810' }}>
                                            {editCap}
                                        </Typography>
                                        <IconButton size="small" onClick={() => setEditCap(c => Math.min(30, c + 1))}>
                                            <AddCircleOutlineIcon sx={{ fontSize: 20, color: '#C9A84C' }} />
                                        </IconButton>
                                    </Box>

                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={handleSaveDetails}
                                        disabled={isSaving}
                                        sx={{ borderColor: 'rgba(201,168,76,0.5)', color: '#9A7833', fontWeight: 600 }}
                                    >
                                        שמור
                                    </Button>
                                </Box>

                                <Divider sx={{ borderColor: 'rgba(201,168,76,0.15)' }} />

                                {/* Shape selector */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                                    <Typography variant="body2" sx={{ color: '#A08070', fontWeight: 600 }}>
                                        צורת השולחן:
                                    </Typography>
                                    <ToggleButtonGroup
                                        value={selectedTable.shape}
                                        exclusive
                                        onChange={handleShapeChange}
                                        size="small"
                                        sx={{
                                            '& .MuiToggleButton-root': {
                                                borderColor: 'rgba(201,168,76,0.35)',
                                                color: '#9A7833',
                                                gap: 0.5,
                                                px: 1.5,
                                                '&.Mui-selected': {
                                                    background: 'rgba(201,168,76,0.18)',
                                                    color: '#2C1810',
                                                    borderColor: 'rgba(201,168,76,0.6)',
                                                },
                                            },
                                        }}
                                    >
                                        <ToggleButton value="round">
                                            <RadioButtonUncheckedIcon sx={{ fontSize: 17 }} />
                                            <Typography variant="caption" sx={{ fontWeight: 600 }}>עגול</Typography>
                                        </ToggleButton>
                                        <ToggleButton value="square">
                                            <CropSquareIcon sx={{ fontSize: 17 }} />
                                            <Typography variant="caption" sx={{ fontWeight: 600 }}>מרובע</Typography>
                                        </ToggleButton>
                                        <ToggleButton value="rect">
                                            <TableRowsIcon sx={{ fontSize: 17 }} />
                                            <Typography variant="caption" sx={{ fontWeight: 600 }}>אבירים</Typography>
                                        </ToggleButton>
                                    </ToggleButtonGroup>
                                </Box>

                                {/* Orientation toggle (rect only) */}
                                {selectedTable.shape === 'rect' && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Typography variant="body2" sx={{ color: '#A08070', fontWeight: 600 }}>
                                            כיוון:
                                        </Typography>
                                        <ToggleButtonGroup
                                            value={selectedTable.orientation ?? 'h'}
                                            exclusive
                                            onChange={handleOrientationChange}
                                            size="small"
                                            sx={{
                                                '& .MuiToggleButton-root': {
                                                    borderColor: 'rgba(201,168,76,0.35)',
                                                    color: '#9A7833',
                                                    gap: 0.5,
                                                    px: 1.5,
                                                    '&.Mui-selected': {
                                                        background: 'rgba(201,168,76,0.18)',
                                                        color: '#2C1810',
                                                        borderColor: 'rgba(201,168,76,0.6)',
                                                    },
                                                },
                                            }}
                                        >
                                            <ToggleButton value="h">
                                                <SwapHorizIcon sx={{ fontSize: 17 }} />
                                                <Typography variant="caption" sx={{ fontWeight: 600 }}>רוחב</Typography>
                                            </ToggleButton>
                                            <ToggleButton value="v">
                                                <SwapHorizIcon sx={{ fontSize: 17, transform: 'rotate(90deg)' }} />
                                                <Typography variant="caption" sx={{ fontWeight: 600 }}>אורך</Typography>
                                            </ToggleButton>
                                        </ToggleButtonGroup>
                                    </Box>
                                )}
                                <Box>
                                    <Typography variant="body2" sx={{ color: '#A08070', mb: 1, fontWeight: 600 }}>
                                        מוזמנים ({selectedTable.guests.reduce((s, g) => s + 1 + (g.plus_count ?? 0), 0)}/{selectedTable.capacity})
                                    </Typography>

                                    {selectedTable.guests.length === 0 ? (
                                        <Typography variant="caption" sx={{ color: '#B8A898', fontStyle: 'italic' }}>
                                            אין מוזמנים בשולחן זה עדיין
                                        </Typography>
                                    ) : (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                            {selectedTable.guests.map(g => (
                                                <Chip
                                                    key={g.id}
                                                    label={g.plus_count > 0 ? `${g.full_name} (+${g.plus_count})` : g.full_name}
                                                    size="small"
                                                    onDelete={() => handleUnassignGuest(g.id)}
                                                    sx={{
                                                        background: 'rgba(201,168,76,0.12)',
                                                        border: '1px solid rgba(201,168,76,0.3)',
                                                        fontWeight: 500,
                                                        color: '#2C1810',
                                                        '& .MuiChip-deleteIcon': { color: '#A08070' },
                                                    }}
                                                />
                                            ))}
                                        </Box>
                                    )}
                                </Box>

                                {/* Add guest autocomplete */}
                                {selectedTable.guests.reduce((s, g) => s + 1 + (g.plus_count ?? 0), 0) < selectedTable.capacity && unassigned.length > 0 && (
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                        <Autocomplete<UnassignedGuest>
                                            options={unassigned}
                                            getOptionLabel={o => o.plus_count > 0 ? `${o.full_name} (+${o.plus_count})` : o.full_name}
                                            value={guestToAdd}
                                            onChange={(_, v) => setGuestToAdd(v)}
                                            size="small"
                                            sx={{ flex: 1 }}
                                            renderInput={params => (
                                                <TextField {...params} label="הוסף מוזמן" placeholder="חיפוש לפי שם…" />
                                            )}
                                            noOptionsText="לא נמצאו אורחים ללא שולחן"
                                        />
                                        <Button
                                            variant="contained"
                                            size="small"
                                            onClick={handleAssignGuest}
                                            disabled={!guestToAdd || isSaving}
                                            sx={{
                                                background: 'linear-gradient(135deg, #E0C97A, #C9A84C)',
                                                color: '#2C1810',
                                                fontWeight: 700,
                                                mt: '2px',
                                                '&:hover': { background: 'linear-gradient(135deg, #E8D490, #D4A855)' },
                                                '&:disabled': { background: 'rgba(201,168,76,0.25)', color: '#B0A090' },
                                            }}
                                        >
                                            שבץ
                                        </Button>
                                    </Box>
                                )}

                                {unassigned.length === 0 && selectedTable.guests.reduce((s, g) => s + 1 + (g.plus_count ?? 0), 0) < selectedTable.capacity && (
                                    <Typography variant="caption" sx={{ color: '#B8A898', fontStyle: 'italic' }}>
                                        כל המוזמנים שובצו לשולחן 🎉
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Add Table Dialog ─────────────────────────────── */}
            <Dialog
                open={addDialogOpen}
                onClose={() => setAddDialogOpen(false)}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        background: 'linear-gradient(145deg, #FDFAF3, #F5EDD9)',
                        border: '1.5px solid rgba(201,168,76,0.25)',
                    },
                }}
            >
                <DialogTitle sx={{ fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 700, color: '#2C1810' }}>
                    הוספת שולחן חדש
                </DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
                    <TextField
                        label="מספר שולחן"
                        type="number"
                        value={newNum}
                        onChange={e => setNewNum(e.target.value)}
                        size="small"
                        inputProps={{ min: 1, max: 999 }}
                        fullWidth
                        autoFocus
                    />
                    <TextField
                        label="שם השולחן (אופציונלי)"
                        value={newLabel}
                        onChange={e => setNewLabel(e.target.value)}
                        size="small"
                        fullWidth
                        placeholder="לדוגמה: שולחן חתן"
                        inputProps={{ maxLength: 40 }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ color: '#A08070' }}>מספר כיסאות:</Typography>
                        <IconButton size="small" onClick={() => setNewCap(c => Math.max(1, c - 1))}>
                            <RemoveCircleOutlineIcon sx={{ fontSize: 20, color: '#C9A84C' }} />
                        </IconButton>
                        <Typography sx={{ minWidth: 28, textAlign: 'center', fontWeight: 700 }}>{newCap}</Typography>
                        <IconButton size="small" onClick={() => setNewCap(c => Math.min(30, c + 1))}>
                            <AddCircleOutlineIcon sx={{ fontSize: 20, color: '#C9A84C' }} />
                        </IconButton>
                    </Box>

                    {/* Shape selector */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography variant="body2" sx={{ color: '#A08070' }}>צורת השולחן:</Typography>
                        <ToggleButtonGroup
                            value={newShape}
                            exclusive
                            onChange={(_e, v) => v && setNewShape(v)}
                            size="small"
                            sx={{
                                '& .MuiToggleButton-root': {
                                    borderColor: 'rgba(201,168,76,0.35)', color: '#9A7833', gap: 0.5, px: 1.5,
                                    '&.Mui-selected': {
                                        background: 'rgba(201,168,76,0.18)', color: '#2C1810',
                                        borderColor: 'rgba(201,168,76,0.6)',
                                    },
                                },
                            }}
                        >
                            <ToggleButton value="round">
                                <RadioButtonUncheckedIcon sx={{ fontSize: 17 }} />
                                <Typography variant="caption" sx={{ fontWeight: 600 }}>עגול</Typography>
                            </ToggleButton>
                            <ToggleButton value="square">
                                <CropSquareIcon sx={{ fontSize: 17 }} />
                                <Typography variant="caption" sx={{ fontWeight: 600 }}>מרובע</Typography>
                            </ToggleButton>
                            <ToggleButton value="rect">
                                <TableRowsIcon sx={{ fontSize: 17 }} />
                                <Typography variant="caption" sx={{ fontWeight: 600 }}>אבירים</Typography>
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Box>

                    {/* Orientation (only for rect) */}
                    {newShape === 'rect' && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Typography variant="body2" sx={{ color: '#A08070' }}>כיוון:</Typography>
                            <ToggleButtonGroup
                                value={newOrientation}
                                exclusive
                                onChange={(_e, v) => v && setNewOrientation(v)}
                                size="small"
                                sx={{
                                    '& .MuiToggleButton-root': {
                                        borderColor: 'rgba(201,168,76,0.35)', color: '#9A7833', gap: 0.5, px: 1.5,
                                        '&.Mui-selected': {
                                            background: 'rgba(201,168,76,0.18)', color: '#2C1810',
                                            borderColor: 'rgba(201,168,76,0.6)',
                                        },
                                    },
                                }}
                            >
                                <ToggleButton value="h">
                                    <SwapHorizIcon sx={{ fontSize: 17 }} />
                                    <Typography variant="caption" sx={{ fontWeight: 600 }}>רוחב</Typography>
                                </ToggleButton>
                                <ToggleButton value="v">
                                    <SwapHorizIcon sx={{ fontSize: 17, transform: 'rotate(90deg)' }} />
                                    <Typography variant="caption" sx={{ fontWeight: 600 }}>אורך</Typography>
                                </ToggleButton>
                            </ToggleButtonGroup>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button onClick={() => setAddDialogOpen(false)} sx={{ color: '#A08070' }}>
                        ביטול
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleAddTable}
                        disabled={!newNum || parseInt(newNum, 10) < 1 || isSaving}
                        sx={{
                            background: 'linear-gradient(135deg, #E0C97A, #C9A84C)',
                            color: '#2C1810',
                            fontWeight: 700,
                            '&:hover': { background: 'linear-gradient(135deg, #E8D490, #D4A855)' },
                            '&:disabled': { background: 'rgba(201,168,76,0.25)', color: '#B0A090' },
                        }}
                    >
                        {isSaving ? <CircularProgress size={18} sx={{ color: '#9A7833' }} /> : 'הוסף שולחן'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Delete Confirm Dialog ────────────────────────── */}
            <Dialog
                open={deleteConfirmId !== null}
                onClose={() => setDeleteConfirmId(null)}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 3, background: 'linear-gradient(145deg, #FDFAF3, #F5EDD9)' },
                }}
            >
                <DialogTitle sx={{ fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 700, color: '#2C1810' }}>
                    מחיקת שולחן
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: '#4A3C30' }}>
                        האם למחוק שולחן זה? כל המוזמנים שישובצו אליו יוסרו ויוחזרו לרשימת הממתינים.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
                    <Button onClick={() => setDeleteConfirmId(null)} sx={{ color: '#A08070' }}>
                        ביטול
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleDeleteTable}
                        disabled={isSaving}
                        sx={{ background: '#C04040', color: '#fff', fontWeight: 700, '&:hover': { background: '#A03030' } }}
                    >
                        {isSaving ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'מחק'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

// ─── Utility ─────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, v));
}
