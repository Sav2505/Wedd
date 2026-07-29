import { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Chip,
    InputAdornment,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    TextField,
    Typography,
    IconButton,
    Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { TablePagination } from '@mui/material';
import { ManagedGuest } from '../../../types/domain';

function buildWhatsAppChatUrl(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    const normalizedPhone = digits.startsWith('0') ? `972${digits.slice(1)}` : digits;
    return `https://wa.me/${normalizedPhone}`;
}

function fmt(n: number) {
    return `₪${Number(n).toLocaleString('he-IL', { maximumFractionDigits: 0 })}`;
}

function GiftAmountCell({
    guest,
    onUpdateGiftAmount,
}: {
    guest: ManagedGuest;
    onUpdateGiftAmount: (guestId: string, amount: number | null) => Promise<void>;
}) {
    const [value, setValue] = useState<string>(guest.gift_amount != null ? String(guest.gift_amount) : '');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setValue(guest.gift_amount != null ? String(guest.gift_amount) : '');
    }, [guest.gift_amount]);

    async function commit() {
        const trimmed = value.trim();
        const parsed = trimmed === '' ? null : Number(trimmed);

        if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) {
            setValue(guest.gift_amount != null ? String(guest.gift_amount) : '');
            return;
        }
        if (parsed === (guest.gift_amount ?? null)) return;

        setSaving(true);
        try {
            await onUpdateGiftAmount(guest.id, parsed);
        } catch {
            setValue(guest.gift_amount != null ? String(guest.gift_amount) : '');
        } finally {
            setSaving(false);
        }
    }

    return (
        <TextField
            size="small"
            type="number"
            value={value}
            disabled={saving}
            onChange={(e) => setValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            placeholder="—"
            inputProps={{ min: 0, style: { textAlign: 'center' } }}
            sx={{ width: 110 }}
            InputProps={{ startAdornment: <InputAdornment position="start">₪</InputAdornment> }}
        />
    );
}

type SortDirection = 'asc' | 'desc';

interface Props {
    guests: ManagedGuest[];
    onUpdateGiftAmount: (guestId: string, amount: number | null) => Promise<void>;
}

const PAGINATION_ROWS= [10, 25, 50];
export default function GuestGiftsTable({ guests, onUpdateGiftAmount }: Props) {
    const [search, setSearch] = useState('');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(PAGINATION_ROWS[0]);

    useEffect(() => {
        setPage(0);
    }, [search, sortDirection]);

    const totalGifts = useMemo(
        () => guests.reduce((sum, g) => sum + (g.gift_amount ?? 0), 0),
        [guests]
    );

    const filteredSortedGuests = useMemo(() => {
        const q = search.trim().toLowerCase();
        const filtered = q
            ? guests.filter((g) =>
                `${g.first_name ?? ''} ${g.last_name ?? ''}`.toLowerCase().includes(q) ||
                g.phone.includes(q)
            )
            : guests;

        return [...filtered].sort((a, b) => {
            const nameA = `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim();
            const nameB = `${b.first_name ?? ''} ${b.last_name ?? ''}`.trim();
            const cmp = nameA.localeCompare(nameB, 'he');
            return sortDirection === 'asc' ? cmp : -cmp;
        });
    }, [guests, search, sortDirection]);

    const paginatedGuests = useMemo(
        () => filteredSortedGuests.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
        [filteredSortedGuests, page, rowsPerPage]
    );

    function toggleSort() {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="h6" sx={{ fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 700 }}>
                    מתנות מהאורחים
                </Typography>
                <Typography variant="subtitle2" sx={{ color: '#9A7833', fontWeight: 800 }}>
                    סה"כ: {fmt(totalGifts)}
                </Typography>
            </Box>

            <TextField
                size="small"
                fullWidth
                placeholder="חיפוש אורח לפי שם / טלפון"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ mb: 1.5 }}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon sx={{ color: '#A08070', fontSize: 20 }} />
                        </InputAdornment>
                    ),
                    endAdornment: search ? (
                        <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setSearch('')} edge="end">
                                <CloseIcon sx={{ fontSize: 16, color: '#A08070' }} />
                            </IconButton>
                        </InputAdornment>
                    ) : undefined,
                }}
            />

            {guests.length === 0 ? (
                <Typography variant="body2" sx={{ color: 'text.secondary', py: 3, textAlign: 'center' }}>
                    עדיין אין אורחים שאישרו הגעה.
                </Typography>
            ) : filteredSortedGuests.length === 0 ? (
                <Typography variant="body2" sx={{ color: 'text.secondary', py: 3, textAlign: 'center' }}>
                    לא נמצאו אורחים התואמים לחיפוש.
                </Typography>
            ) : (
                <TableContainer
                    sx={{
                        borderRadius: 3,
                        border: '1px solid rgba(201,168,76,0.18)',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                        maxHeight: 480,
                        overflowY: 'auto',
                    }}
                >
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow sx={{ bgcolor: 'rgba(201,168,76,0.08)' }}>
                                <TableCell sx={{ fontWeight: 700, bgcolor: '#FFFCF5' }}>
                                    <TableSortLabel
                                        active
                                        direction={sortDirection}
                                        onClick={toggleSort}
                                        sx={{
                                            '& .MuiTableSortLabel-icon': { color: '#9A7833 !important' },
                                        }}
                                    >
                                        שם אורח
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell sx={{ fontWeight: 700, bgcolor: '#FFFCF5' }}>טלפון</TableCell>
                                <TableCell sx={{ fontWeight: 700, bgcolor: '#FFFCF5' }}>צד</TableCell>
                                <TableCell sx={{ fontWeight: 700, bgcolor: '#FFFCF5' }} align="center">מס' אורחים</TableCell>
                                <TableCell sx={{ fontWeight: 700, bgcolor: '#FFFCF5' }} align="center">סכום מתנה</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedGuests.map((guest) => (
                                <TableRow key={guest.id} hover>
                                    <TableCell sx={{ fontWeight: 600 }}>{guest.first_name} {guest.last_name}</TableCell>
                                    <TableCell>
                                        <Tooltip title={`שליחת WhatsApp ל${guest.first_name}`} arrow placement="top">
                                            <Box
                                                component="a"
                                                href={buildWhatsAppChatUrl(guest.phone)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                sx={{
                                                    color: '#1f9f51',
                                                    textDecoration: 'none',
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    '&:hover': { textDecoration: 'underline' },
                                                }}
                                            >
                                                {guest.phone}
                                            </Box>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell>
                                        {guest.side ? <Chip size="small" label={guest.side} sx={{ height: 20, fontSize: '0.68rem' }} /> : '—'}
                                    </TableCell>
                                    <TableCell align="center">{guest.number_of_guests}</TableCell>
                                    <TableCell align="center">
                                        <GiftAmountCell guest={guest} onUpdateGiftAmount={onUpdateGiftAmount} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
            <TablePagination
                component="div"
                count={filteredSortedGuests.length}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                }}
                rowsPerPageOptions={PAGINATION_ROWS}
                labelRowsPerPage="שורות בעמוד:"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} מתוך ${count}`}
                sx={{
                    '.MuiTablePagination-toolbar': { px: 1 },
                    color: '#6E5424',
                }}
            />
        </Box>
    );
}