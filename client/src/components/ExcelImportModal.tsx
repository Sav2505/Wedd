import { useRef, useState } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    LinearProgress,
    Stack,
    Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { ManagedGuest } from '../types/domain';
import { createGuest } from '../services/guests.service';

// ---------- types ----------

type Step = 'instructions' | 'preview' | 'importing' | 'done';
type SideOption = 'חתן' | 'כלה' | 'שניהם' | null;

interface ParsedRow {
    first_name: string;
    last_name: string;
    phone: string;
    normalizedPhone: string;
    side: SideOption;
    plus_count: number;
    isDuplicate: boolean;
    rowIndex: number;
}

interface Props {
    open: boolean;
    weddingId: number;
    existingGuests: ManagedGuest[];
    onClose: () => void;
    onImportComplete: () => void;
}

// ---------- helpers ----------

const REQUIRED_COLS = ['שם פרטי', 'שם משפחה', 'טלפון'] as const;
const VALID_SIDES = ['חתן', 'כלה', 'שניהם'] as const;

function normalizePhone(phone: string): string {
    return String(phone).replace(/\D/g, '');
}

// ---------- component ----------

export default function ExcelImportModal({
    open,
    weddingId,
    existingGuests,
    onClose,
    onImportComplete,
}: Props) {
    const [step, setStep] = useState<Step>('instructions');
    const [parseError, setParseError] = useState<string | null>(null);
    const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
    const [importDone, setImportDone] = useState(0);
    const [importTotal, setImportTotal] = useState(0);
    const [importErrors, setImportErrors] = useState(0);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const newGuests = parsedRows.filter((r) => !r.isDuplicate);
    const duplicates = parsedRows.filter((r) => r.isDuplicate);

    function resetAndClose() {
        setStep('instructions');
        setParseError(null);
        setParsedRows([]);
        setImportDone(0);
        setImportTotal(0);
        setImportErrors(0);
        onClose();
    }

    // ---------- download template ----------

    async function handleDownloadTemplate() {
        const wb = new ExcelJS.Workbook();
        const sheet = wb.addWorksheet('אורחים', { views: [{ rightToLeft: true }] });

        sheet.columns = [
            { key: 'first_name', width: 18 },
            { key: 'last_name', width: 22 },
            { key: 'phone', width: 22 },
            { key: 'side', width: 14 },
            { key: 'guests', width: 16 },
        ];

        const hr = sheet.addRow(['שם פרטי', 'שם משפחה', 'טלפון', 'צד', 'מספר אורחים']);
        hr.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FF2C1810' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0D88C' } };
            cell.border = {
                top: { style: 'thin' },
                bottom: { style: 'thin' },
                left: { style: 'thin' },
                right: { style: 'thin' },
            };
            cell.alignment = { horizontal: 'center' };
        });

        // Format phone column as text to preserve leading zeros
        sheet.getColumn(3).numFmt = '@';

        // Sample rows
        sheet.addRow(['ישראל', 'ישראלי', '0501234567', 'חתן', 2]);
        sheet.addRow(['שרה', 'כהן', '0521234567', 'כלה', '']);
        sheet.addRow(['יוסי', 'לוי', '0541234567', '', 3]);

        const buf = await wb.xlsx.writeBuffer();
        saveAs(
            new Blob([buf], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            }),
            'תבנית_ייבוא_אורחים.xlsx',
        );
    }

    // ---------- file parsing ----------

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setParseError(null);

        try {
            const buffer = await file.arrayBuffer();
            const wb = new ExcelJS.Workbook();
            await wb.xlsx.load(buffer);

            const sheet = wb.worksheets[0];
            if (!sheet) throw new Error('הקובץ לא מכיל גיליונות');

            // Build header name → 1-based column index map
            const headers: Record<string, number> = {};
            sheet.getRow(1).eachCell((cell, col) => {
                const v = String(cell.value ?? '').trim();
                if (v) headers[v] = col;
            });

            const missing = REQUIRED_COLS.filter((c) => !(c in headers));
            if (missing.length > 0) {
                throw new Error(`העמודות הבאות חסרות בקובץ: ${missing.join(', ')}`);
            }

            const existingPhones = new Set(existingGuests.map((g) => normalizePhone(g.phone)));

            const rows: ParsedRow[] = [];

            sheet.eachRow((row, rowIndex) => {
                if (rowIndex === 1) return; // skip header

                const get = (col: string) =>
                    String(row.getCell(headers[col] ?? 0).value ?? '').trim();

                const first_name = get('שם פרטי');
                const last_name = get('שם משפחה');
                const phone = get('טלפון');

                // Skip fully empty rows
                if (!first_name && !last_name && !phone) return;
                // Skip rows that are partially filled (missing required fields)
                if (!first_name || !last_name || !phone) return;

                const normalizedPhone = normalizePhone(phone);

                const sideRaw = headers['צד'] ? get('צד') : '';
                const side: SideOption = (VALID_SIDES as readonly string[]).includes(sideRaw)
                    ? (sideRaw as SideOption)
                    : 'כלה';

                const guestsRaw = headers['מספר אורחים']
                    ? Number(row.getCell(headers['מספר אורחים']).value ?? 1)
                    : 1;
                const totalGuests =
                    Number.isFinite(guestsRaw) && guestsRaw >= 1 ? Math.round(guestsRaw) : 1;

                rows.push({
                    first_name,
                    last_name,
                    phone,
                    normalizedPhone,
                    side,
                    plus_count: totalGuests - 1,
                    isDuplicate: existingPhones.has(normalizedPhone),
                    rowIndex,
                });
            });

            if (rows.length === 0) throw new Error('לא נמצאו שורות נתונים בקובץ');

            setParsedRows(rows);
            setStep('preview');
        } catch (err) {
            setParseError(err instanceof Error ? err.message : 'שגיאה בקריאת הקובץ');
        } finally {
            // Allow re-selecting the same file
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }

    // ---------- import ----------

    async function handleConfirmImport() {
        const toImport = newGuests;
        setImportTotal(toImport.length);
        setImportDone(0);
        setImportErrors(0);
        setStep('importing');

        let errors = 0;
        for (let i = 0; i < toImport.length; i++) {
            const g = toImport[i];
            try {
                await createGuest({
                    wedding_id: weddingId,
                    first_name: g.first_name,
                    last_name: g.last_name,
                    phone: g.phone,
                    side: g.side,
                    guest_group_id: null,
                    plus_count: g.plus_count,
                });
            } catch {
                errors++;
            }
            setImportDone(i + 1);
        }

        setImportErrors(errors);
        onImportComplete();
        setStep('done');
    }

    // ---------- step titles ----------

    const titleMap: Record<Step, string> = {
        instructions: 'ייבוא אורחים מ-Excel',
        preview: 'אישור ייבוא',
        importing: 'מייבא אורחים...',
        done: 'הייבוא הושלם',
    };

    // ---------- render ----------

    return (
        <Dialog
            open={open}
            onClose={step === 'importing' ? undefined : resetAndClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { borderRadius: 2 } }}
        >
            {/* ── Title bar ── */}
            <DialogTitle
                sx={{
                    fontFamily: "'Frank Ruhl Libre', serif",
                    fontWeight: 700,
                    background: 'linear-gradient(145deg, rgba(255,252,245,0.97), rgba(249,240,220,0.97))',
                    borderBottom: '1px solid rgba(201,168,76,0.2)',
                    py: 1.5,
                }}
            >
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography
                        sx={{ fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 700, fontSize: '1.1rem' }}
                    >
                        {titleMap[step]}
                    </Typography>
                    {/* Step dots */}
                    {step !== 'importing' && (
                        <Stack direction="row" spacing={0.7}>
                            {(['instructions', 'preview', 'done'] as Step[]).map((s) => (
                                <Box
                                    key={s}
                                    sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        bgcolor: step === s ? '#C9A84C' : 'rgba(201,168,76,0.3)',
                                        transition: 'background-color 0.3s',
                                    }}
                                />
                            ))}
                        </Stack>
                    )}
                </Stack>
            </DialogTitle>

            {/* ══════════════════════════════════════
          STEP 1 — Instructions
          ══════════════════════════════════════ */}
            {step === 'instructions' && (
                <>
                    <DialogContent sx={{ pt: 2 }}>
                        {/* Info banner */}
                        <Box
                            sx={{
                                mb: 2,
                                p: 1.5,
                                borderRadius: 2,
                                background: 'rgba(201,168,76,0.08)',
                                border: '1px solid rgba(201,168,76,0.3)',
                            }}
                        >
                            <Stack direction="row" spacing={1} alignItems="flex-start">
                                <InfoOutlinedIcon sx={{ color: '#9A7833', mt: 0.25, flexShrink: 0 }} />
                                <Typography variant="body2" sx={{ color: '#5C4520', lineHeight: 1.75 }}>
                                    ייבוא אורחים ממסמך Excel. האורחים יצורפו אוטומטית ל
                                    <strong>"ללא קבוצה"</strong>.{' '}
                                    המערכת תדלג על אורחים שמספר הטלפון שלהם כבר קיים במערכת.
                                </Typography>
                            </Stack>
                        </Box>

                        {/* Column format table */}
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: '#3A2610' }}>
                            מבנה העמודות הנדרש:
                        </Typography>

                        <Box sx={{ overflowX: 'auto', mb: 2.5 }}>
                            <table style={{ borderCollapse: 'collapse', width: '100%', direction: 'rtl' }}>
                                <thead>
                                    <tr style={{ background: '#F0D88C' }}>
                                        {['עמודה', 'חובה?', 'דוגמה', 'הסבר'].map((h) => (
                                            <th
                                                key={h}
                                                style={{
                                                    padding: '7px 12px',
                                                    border: '1px solid #D4B860',
                                                    fontSize: 13,
                                                    color: '#2C1810',
                                                    textAlign: 'right',
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { col: 'שם פרטי', req: true, ex: 'ישראל', note: '' },
                                        { col: 'שם משפחה', req: true, ex: 'ישראלי', note: '' },
                                        { col: 'טלפון', req: true, ex: '0501234567', note: 'שמור כטקסט' },
                                        { col: 'צד', req: false, ex: 'חתן / כלה / שניהם', note: 'ברירת מחדל: כלה' },
                                        { col: 'מספר אורחים', req: false, ex: '2', note: 'ברירת מחדל: 1' },
                                    ].map(({ col, req, ex, note }, i) => (
                                        <tr key={col} style={{ background: i % 2 === 0 ? 'rgba(255,248,220,0.55)' : 'white' }}>
                                            <td
                                                style={{
                                                    padding: '6px 12px',
                                                    border: '1px solid #E8D8A0',
                                                    fontWeight: 700,
                                                    color: '#2C1810',
                                                    fontSize: 13,
                                                }}
                                            >
                                                {col}
                                            </td>
                                            <td
                                                style={{
                                                    padding: '6px 12px',
                                                    border: '1px solid #E8D8A0',
                                                    textAlign: 'center',
                                                }}
                                            >
                                                {req ? (
                                                    <span style={{ color: '#C04040', fontWeight: 700, fontSize: 12 }}>
                                                        ✓ חובה
                                                    </span>
                                                ) : (
                                                    <span style={{ color: '#6C6C6C', fontSize: 12 }}>רשות</span>
                                                )}
                                            </td>
                                            <td
                                                style={{
                                                    padding: '6px 12px',
                                                    border: '1px solid #E8D8A0',
                                                    color: '#5C4520',
                                                    fontSize: 13,
                                                }}
                                            >
                                                {ex}
                                            </td>
                                            <td
                                                style={{
                                                    padding: '6px 12px',
                                                    border: '1px solid #E8D8A0',
                                                    color: '#888',
                                                    fontSize: 12,
                                                }}
                                            >
                                                {note}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Box>

                        {/* Parse error */}
                        {parseError && (
                            <Alert
                                severity="error"
                                sx={{ mb: 2, borderRadius: 2 }}
                                onClose={() => setParseError(null)}
                            >
                                {parseError}
                            </Alert>
                        )}

                        {/* Actions */}
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
                            <Button
                                variant="outlined"
                                startIcon={<DownloadIcon />}
                                onClick={handleDownloadTemplate}
                                sx={{
                                    flex: 1,
                                    borderColor: 'rgba(201,168,76,0.5)',
                                    color: '#9A7833',
                                    fontWeight: 600,
                                    '&:hover': { borderColor: '#C9A84C', background: 'rgba(201,168,76,0.06)' },
                                }}
                            >
                                הורד תבנית Excel
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<UploadFileIcon />}
                                onClick={() => fileInputRef.current?.click()}
                                sx={{
                                    flex: 1,
                                    background: 'linear-gradient(135deg, #E0C97A, #C9A84C)',
                                    color: '#2C1810',
                                    fontWeight: 700,
                                    '&:hover': { background: 'linear-gradient(135deg, #E8D490, #D4A855)' },
                                }}
                            >
                                בחר קובץ Excel
                            </Button>
                        </Stack>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls"
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={resetAndClose} sx={{ color: '#A08070' }}>
                            סגירה
                        </Button>
                    </DialogActions>
                </>
            )}

            {/* ══════════════════════════════════════
          STEP 2 — Preview & confirm
          ══════════════════════════════════════ */}
            {step === 'preview' && (
                <>
                    <DialogContent sx={{ pt: 2 }}>
                        {/* Summary counters */}
                        <Stack direction="row" spacing={1.5} padding={1} mb={2} sx={{ flexWrap: 'wrap', gap: 1.5 }}>
                            <Box
                                sx={{
                                    flex: 1,
                                    minWidth: 110,
                                    p: 1.5,
                                    borderRadius: 2,
                                    background: 'rgba(46,139,87,0.10)',
                                    border: '1px solid rgba(46,139,87,0.3)',
                                    textAlign: 'center',
                                }}
                            >
                                <Typography
                                    sx={{ fontSize: '2rem', fontWeight: 800, color: '#2E8B57', lineHeight: 1 }}
                                >
                                    {newGuests.length}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#2E8B57', fontWeight: 600, }}>
                                    אורחים חדשים
                                </Typography>
                            </Box>

                            {duplicates.length > 0 && (
                                <Box
                                    sx={{
                                        flex: 1,
                                        minWidth: 110,
                                        p: 1.5,
                                        borderRadius: 2,
                                        background: 'rgba(185,71,61,0.09)',
                                        border: '1px solid rgba(185,71,61,0.25)',
                                        textAlign: 'center',
                                    }}
                                >
                                    <Typography
                                        sx={{ fontSize: '2rem', fontWeight: 800, color: '#B9473D', lineHeight: 1 }}
                                    >
                                        {duplicates.length}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: '#B9473D', fontWeight: 600 }}>
                                        כבר קיימים — ידולגו
                                    </Typography>
                                </Box>
                            )}
                        </Stack>

                        {/* "No group" notice */}
                        <Alert
                            severity="info"
                            icon={<InfoOutlinedIcon fontSize="small" />}
                            sx={{
                                mb: 2,
                                borderRadius: 2,
                                bgcolor: 'rgba(201,168,76,0.10)',
                                color: '#5C4520',
                                border: '1px solid rgba(201,168,76,0.35)',
                                '& .MuiAlert-icon': { color: '#9A7833' },
                            }}
                        >
                            האורחים יצורפו ל<strong>"ללא קבוצה"</strong> — ניתן לשייך לקבוצה לאחר הייבוא.
                        </Alert>

                        {/* Duplicate note */}
                        {duplicates.length > 0 && (
                            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                                {duplicates.length === 1
                                    ? 'אורח אחד כבר נטען במערכת ולא יוכפל (זיהוי לפי מספר טלפון).'
                                    : `${duplicates.length} אורחים כבר נטענו במערכת ולא יוכפלו (זיהוי לפי מספר טלפון).`}
                            </Alert>
                        )}

                        {/* New guests list */}
                        {newGuests.length > 0 ? (
                            <>
                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: '#3A2610' }}>
                                    אורחים שייובאו ({newGuests.length}):
                                </Typography>
                                <Box
                                    sx={{
                                        maxHeight: 260,
                                        overflowY: 'auto',
                                        border: '1px solid rgba(201,168,76,0.25)',
                                        borderRadius: 2,
                                    }}
                                >
                                    {newGuests.map((g, i) => (
                                        <Box
                                            key={g.rowIndex}
                                            sx={{
                                                px: 1.5,
                                                py: 0.85,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: 1,
                                                borderBottom:
                                                    i < newGuests.length - 1
                                                        ? '1px solid rgba(201,168,76,0.12)'
                                                        : 'none',
                                                background: i % 2 === 0 ? 'rgba(255,252,245,0.85)' : 'white',
                                            }}
                                        >
                                            <Box>
                                                <Typography
                                                    sx={{ fontWeight: 700, fontSize: '0.88rem', color: '#2C1810' }}
                                                >
                                                    {g.first_name} {g.last_name}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: '#8E7460' }}>
                                                    {g.phone}
                                                </Typography>
                                            </Box>
                                            <Stack direction="row" spacing={0.5}>
                                                {g.side && (
                                                    <Chip
                                                        size="small"
                                                        label={g.side}
                                                        sx={{ height: 20, fontSize: '0.68rem' }}
                                                    />
                                                )}
                                                {g.plus_count > 0 && (
                                                    <Chip
                                                        size="small"
                                                        label={`+${g.plus_count}`}
                                                        sx={{
                                                            height: 20,
                                                            fontSize: '0.68rem',
                                                            bgcolor: 'rgba(154,120,51,0.15)',
                                                            color: '#7A5C1E',
                                                            fontWeight: 700,
                                                        }}
                                                    />
                                                )}
                                            </Stack>
                                        </Box>
                                    ))}
                                </Box>
                            </>
                        ) : (
                            <Alert severity="warning" sx={{ borderRadius: 2 }}>
                                כל האורחים בקובץ כבר קיימים במערכת. אין מה לייבא.
                            </Alert>
                        )}
                    </DialogContent>

                    <DialogActions sx={{ marginBottom: "6px" }}>
                        <Button
                            onClick={() => {
                                setStep('instructions');
                                setParseError(null);
                                setParsedRows([]);
                            }}
                            sx={{ color: '#A08070' }}
                        >
                            חזרה
                        </Button>
                        <Button
                            variant="contained"
                            onClick={handleConfirmImport}
                            disabled={newGuests.length === 0}
                            sx={{
                                background: 'linear-gradient(135deg, #E0C97A, #C9A84C)',
                                color: '#2C1810',
                                fontWeight: 700,
                                '&:hover': { background: 'linear-gradient(135deg, #E8D490, #D4A855)' },
                            }}
                        >
                            ייבא {newGuests.length} אורחים
                        </Button>
                    </DialogActions>
                </>
            )}

            {/* ══════════════════════════════════════
          STEP 3 — Importing (progress)
          ══════════════════════════════════════ */}
            {step === 'importing' && (
                <DialogContent sx={{ py: 5 }}>
                    <Stack alignItems="center" spacing={2.5}>
                        <CircularProgress sx={{ color: '#C9A84C' }} size={52} thickness={4} />
                        <Typography sx={{ fontWeight: 700, color: '#2C1810', fontSize: '1.05rem' }}>
                            מייבא אורחים...
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#8A7565' }}>
                            {importDone} / {importTotal}
                        </Typography>
                        <Box sx={{ width: '100%', maxWidth: 320 }}>
                            <LinearProgress
                                variant="determinate"
                                value={importTotal > 0 ? Math.round((importDone / importTotal) * 100) : 0}
                                sx={{
                                    height: 8,
                                    borderRadius: 4,
                                    bgcolor: 'rgba(201,168,76,0.2)',
                                    '& .MuiLinearProgress-bar': { bgcolor: '#C9A84C', borderRadius: 4 },
                                }}
                            />
                        </Box>
                    </Stack>
                </DialogContent>
            )}

            {/* ══════════════════════════════════════
          STEP 4 — Done
          ══════════════════════════════════════ */}
            {step === 'done' && (
                <>
                    <DialogContent sx={{ py: 4 }}>
                        <Stack alignItems="center" spacing={2.5}>
                            <CheckCircleIcon sx={{ fontSize: 62, color: '#2E8B57' }} />
                            <Typography
                                sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#2C1810', textAlign: 'center' }}
                            >
                                הייבוא הושלם!
                            </Typography>
                            <Typography
                                sx={{ color: '#5C4520', textAlign: 'center', lineHeight: 1.85, fontSize: '0.97rem' }}
                            >
                                נקלטו בהצלחה{' '}
                                <strong style={{ color: '#2E8B57', fontSize: '1.1em' }}>
                                    {importTotal - importErrors}
                                </strong>{' '}
                                אורחים
                                {duplicates.length > 0 && (
                                    <>
                                        {' '}·{' '}
                                        <strong>{duplicates.length}</strong> דולגו (כבר קיימים)
                                    </>
                                )}
                                {importErrors > 0 && (
                                    <>
                                        {' '}·{' '}
                                        <strong style={{ color: '#B9473D' }}>{importErrors}</strong> נכשלו
                                    </>
                                )}
                            </Typography>

                            {importErrors > 0 && (
                                <Alert severity="warning" sx={{ borderRadius: 2, width: '100%' }}>
                                    {importErrors} אורחים לא נקלטו עקב שגיאה בשרת (ייתכן שכבר קיימים עם שם שונה אך
                                    אותו טלפון).
                                </Alert>
                            )}
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <Button
                            variant="contained"
                            onClick={resetAndClose}
                            sx={{
                                background: 'linear-gradient(135deg, #E0C97A, #C9A84C)',
                                color: '#2C1810',
                                fontWeight: 700,
                                '&:hover': { background: 'linear-gradient(135deg, #E8D490, #D4A855)' },
                            }}
                        >
                            סגירה
                        </Button>
                    </DialogActions>
                </>
            )}
        </Dialog>
    );
}
