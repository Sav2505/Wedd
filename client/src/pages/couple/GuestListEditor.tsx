import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import { useAppSelector } from '../../store';
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
  IconButton,
  InputAdornment,
  MenuItem,
  Skeleton,
  Snackbar,
  Stack,
  TextField,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
} from '@mui/material';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import TableRestaurantIcon from '@mui/icons-material/TableRestaurant';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import LinkIcon from '@mui/icons-material/Link';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import DownloadIcon from '@mui/icons-material/Download';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { exportGuestsToExcel } from '../../utils/exportGuestsToExcel';
import { buildGuestUrl } from '../../utils/guestUrl';
import { getEffectivePartySize, getEffectivePlusCount, getInvitedPartySize } from '../../utils/effectiveAttendance';
import { GuestGroup, ManagedGuest, RsvpStatus } from '../../types/domain';
import {
  createGuest,
  createGuestGroup,
  deleteGuest,
  deleteGuestGroup,
  getGuestGroups,
  getGuests,
  updateGuest,
  updateGuestGroup,
} from '../../services/guests.service';
import { getWeddingInfo } from '../../services/info.service';

type SideOption = 'חתן' | 'כלה' | 'שניהם' | null;

type GuestForm = {
  first_name: string;
  last_name: string;
  phone: string;
  side: SideOption;
  guest_group_id: string | null;
  plus_count: number;
  gift_amount: number | null;
};

const EMPTY_FORM: GuestForm = {
  first_name: '',
  last_name: '',
  phone: '',
  side: null,
  guest_group_id: null,
  plus_count: 0,
  gift_amount: null,
};

type RsvpFilter = 'ALL' | RsvpStatus;

function getRsvpMeta(status: RsvpStatus, numberOfGuests: number): {
  label: string;
  bg: string;
  color: string;
  border: string;
} {
  if (status === 'COMING') {
    return {
      label: `מגיע${numberOfGuests > 1 ? ` (+${numberOfGuests - 1})` : ''}`,
      bg: 'rgba(46,139,87,0.13)',
      color: '#2E8B57',
      border: 'rgba(46,139,87,0.35)',
    };
  }

  if (status === 'NOT_COMING') {
    return {
      label: 'לא מגיע',
      bg: 'rgba(185,71,61,0.12)',
      color: '#B9473D',
      border: 'rgba(185,71,61,0.35)',
    };
  }

  return {
    label: 'ממתין',
    bg: 'rgba(140,140,140,0.14)',
    color: '#6C6C6C',
    border: 'rgba(140,140,140,0.35)',
  };
}

function formatRsvpUpdatedAt(ts: string | null): string | null {
  if (!ts) return null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatWeddingDate(weddingDate: string) {
  const d = new Date(weddingDate + 'T12:00:00');

  const weekday = d.toLocaleDateString('he-IL', {
    weekday: 'long',
  });

  const date = d.toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return `${weekday}, ${date}`;
}

// להחליף את כל הפונקציה buildWhatsAppInviteUrl בזו:

function buildWhatsAppInviteUrl(weddingId: number, guest: ManagedGuest, brideAndGroom: string, weddingDate: string | undefined): string {
  if (weddingId < 0) {
    throw new Error('Invalid weddingId for WhatsApp invite URL');
  }

  const digits = guest.phone.replace(/\D/g, '');
  const normalizedPhone = digits.startsWith('0') ? `972${digits.slice(1)}` : digits;
  const personalLink = buildGuestUrl(`${guest.first_name} ${guest.last_name}`, digits.slice(-4), weddingId);
  const formattedDate = weddingDate ? formatWeddingDate(weddingDate) : undefined;


  const message = [
    `שלום ${guest.first_name} 💛`,
    '',
    `אנו שמחים ונרגשים להזמינך ליום חתונתנו 💍✨`,
    formattedDate ? `📅 מועד האירוע: ${formattedDate}` : '',
    '',
    'נא אשר/י הגעתך בקישור המצורף, שנוכל להיערך בהתאם 🙏',
    '',
    personalLink,
    '',
    'מחכים להתרגש, לשמוח ולחגוג איתך את אחד הימים המיוחדים בחיינו. 🥂❤️',
    '',
    brideAndGroom ? `באהבה,\n${brideAndGroom} 💕` : 'באהבה 💕',
  ]
    .filter(Boolean)
    .join('\n');

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

function computeGroupChipLabel(items: ManagedGuest[]) {
  const total = items.reduce((s, g) => s + getEffectivePartySize(g), 0);
  if (items.length > 0) {
    return (
      <Box component="span" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '0.65rem', lineHeight: 1.5, padding: '2px 4px' }}>
        <span>{items.length} רשומים</span>
        <span style={{ fontSize: '0.75rem', fontWeight: "bold" }}>{total} סה"כ</span>
      </Box>
    );
  }
  return <span style={{ fontSize: '0.72rem' }}>
    ללא רשומים
  </span>
}
const UNGROUPED_KEY = '__ungrouped__';

export default function GuestListEditor() {
  const currentUser = useAppSelector((state) => state.auth.guest);
  const [groups, setGroups] = useState<GuestGroup[]>([]);
  const [allGuests, setAllGuests] = useState<ManagedGuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [rsvpFilter, setRsvpFilter] = useState<RsvpFilter>('ALL');

  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GuestGroup | null>(null);
  const [groupName, setGroupName] = useState('');

  const [guestDialogOpen, setGuestDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<ManagedGuest | null>(null);
  const [guestForm, setGuestForm] = useState<GuestForm>(EMPTY_FORM);

  const [deleteGuestId, setDeleteGuestId] = useState<string | null>(null);
  const [deletingGuest, setDeletingGuest] = useState(false);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [rsvpListStatus, setRsvpListStatus] = useState<RsvpStatus | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [rsvpListLoadingStatus, setRsvpListLoadingStatus] = useState<RsvpStatus | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<{ id: number; bride_name?: string; groom_name?: string, wedding_date?: string } | null>(null);

  // --- Post-save feedback: success toast + highlight/scroll to the affected guest ---
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [guestDialogError, setGuestDialogError] = useState<string | null>(null);
  const [highlightedGuestId, setHighlightedGuestId] = useState<string | null>(null);
  const guestRowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const highlightTimeoutRef = useRef<number | null>(null);

  const registerGuestRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      guestRowRefs.current.set(id, el);
    } else {
      guestRowRefs.current.delete(id);
    }
  }, []);

  useEffect(() => {
    getWeddingInfo().then(setInfo).catch(() => {/* non-critical */ });
  }, []);

  const searchRef = useRef(search);
  useEffect(() => { searchRef.current = search; }, [search]);

  const currentUserRef = useRef(currentUser);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  const reload = useCallback(async () => {
    const [nextGroups, nextGuests] = await Promise.all([getGuestGroups(), getGuests()]);
    setGroups(nextGroups);
    setAllGuests(nextGuests);
    return { nextGroups, nextGuests };
  }, []);

  useEffect(() => {
    reload()
      .catch(() => setError('שגיאה בטעינת רשימת אורחים'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const t = setTimeout(() => setSearchLoading(false), 1500);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const interval = setInterval(() => {
      reload().catch(() => { });
    }, 120000);
    return () => clearInterval(interval);
  }, [reload]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        window.clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  const processedGuests = useMemo(() => {
    const q = search.trim().toLowerCase();
    const bySearch = q
      ? allGuests.filter((g) =>
        g.full_name.toLowerCase().includes(q) ||
        g.phone.includes(q) ||
        (g.group_name ?? '').toLowerCase().includes(q)
      )
      : allGuests;
    return rsvpFilter === 'ALL'
      ? bySearch
      : bySearch.filter((g) => g.rsvp_status === rsvpFilter);
  }, [allGuests, search, rsvpFilter]);

  const rsvpSummary = useMemo(() => {
    let coming = 0, notComing = 0, pending = 0, effectiveTotalPeople = 0;
    for (const g of allGuests) {
      if (g.rsvp_status === 'COMING') {
        const size = getEffectivePartySize(g);
        coming += size;
        effectiveTotalPeople += size;
      } else if (g.rsvp_status === 'NOT_COMING') {
        const size = getInvitedPartySize(g);
        notComing += size;
        effectiveTotalPeople += size;
      } else {
        const size = getInvitedPartySize(g);
        pending += size;
        effectiveTotalPeople += size;
      }
    }
    return { coming, notComing, pending, effectiveTotalPeople };
  }, [allGuests]);

  const grouped = useMemo(() => {
    const map = new Map<string, ManagedGuest[]>();

    for (const g of groups) {
      map.set(g.id, []);
    }

    const ungrouped: ManagedGuest[] = [];
    for (const guest of processedGuests) {
      if (guest.guest_group_id && map.has(guest.guest_group_id)) {
        map.get(guest.guest_group_id)!.push(guest);
      } else {
        ungrouped.push(guest);
      }
    }

    return { map, ungrouped };
  }, [groups, processedGuests]);

  const groupedRef = useRef(grouped);
  useEffect(() => { groupedRef.current = grouped; }, [grouped]);

  useEffect(() => {
    const isFiltering = search.trim() !== '' || rsvpFilter !== 'ALL';
    if (!isFiltering) {
      // לא מסננים - לא נוגעים ב-expandedGroups בכלל, כדי לא לסגור קבוצות
      // שהמשתמש פתח ידנית (כולל אחרי reload מ-save).
      return;
    }
    const current = groupedRef.current;
    const next = new Set<string>();
    for (const [groupId, items] of current.map.entries()) {
      if (items.length > 0) next.add(groupId);
    }
    if (current.ungrouped.length > 0) next.add(UNGROUPED_KEY);
    setExpandedGroups(next);
  }, [search, rsvpFilter]);

  const toggleGroup = useCallback((id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const rsvpListGuests = useMemo(() => {
    if (!rsvpListStatus) return [];
    return allGuests
      .filter((g) => g.rsvp_status === rsvpListStatus)
      .sort((a, b) => a.full_name.localeCompare(b.full_name, 'he'));
  }, [allGuests, rsvpListStatus]);

  const rsvpListPeopleCount = useMemo(() => {
    return rsvpListGuests.reduce((sum, g) => {
      const size = rsvpListStatus === 'COMING' ? getEffectivePartySize(g) : getInvitedPartySize(g);
      return sum + size;
    }, 0);
  }, [rsvpListGuests, rsvpListStatus]);

  const rsvpListTitle = useMemo(() => {
    if (rsvpListStatus === 'COMING') return 'רשימת מאשרים';
    if (rsvpListStatus === 'NOT_COMING') return 'רשימת מסרבים';
    if (rsvpListStatus === 'PENDING') return 'רשימת טרם אישרו';
    return '';
  }, [rsvpListStatus]);

  function handleOpenRsvpList(status: RsvpStatus) {
    if (rsvpListLoadingStatus) return;
    setRsvpListLoadingStatus(status);

    // Small defer lets the loading state render before heavy dialog content mounts.
    window.setTimeout(() => {
      setRsvpListStatus(status);
      setRsvpListLoadingStatus(null);
    }, 140);
  }

  const handleEditGuestOpen = useCallback((guest: ManagedGuest) => {
    setEditingGuest(guest);
    setGuestForm({
      first_name: guest.first_name ?? '',
      last_name: guest.last_name ?? '',
      phone: guest.phone,
      side: guest.side,
      guest_group_id: guest.guest_group_id,
      plus_count: guest.plus_count ?? 0,
      gift_amount: guest.gift_amount ?? null,
    });
    setGuestDialogOpen(true);
  }, []);

  const handleDeleteGuestOpen = useCallback((id: string) => {
    setDeleteGuestId(id);
  }, []);

  const handleSendInvitation = useCallback((guest: ManagedGuest) => {
    window.open(buildWhatsAppInviteUrl(info?.id ?? -1, guest, `${info?.bride_name ?? "שחר"} & ${info?.groom_name ?? "שחר"}`, info?.wedding_date ?? "יום שני, 7 בדצמבר 2026"), '_blank', 'noopener,noreferrer');
  }, [info]);

  function openCreateGroup() {
    setEditingGroup(null);
    setGroupName('');
    setGroupDialogOpen(true);
  }

  const openEditGroup = useCallback((group: GuestGroup) => {
    setEditingGroup(group);
    setGroupName(group.name);
    setGroupDialogOpen(true);
  }, []);

  async function handleSaveGroup() {
    if (!groupName.trim()) return;
    setSaving(true);
    try {
      if (editingGroup) {
        await updateGuestGroup(editingGroup.id, groupName.trim());
      } else {
        await createGuestGroup(groupName.trim(), info?.id ?? -1);
      }
      await reload();
      setGroupDialogOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בשמירת קבוצה');
    } finally {
      setSaving(false);
    }
  }

  const openCreateGuest = useCallback((groupId: string | null = null) => {
    setEditingGuest(null);
    const cu = currentUserRef.current;
    const defaultSide: SideOption = cu?.side === 'חתן' ? 'חתן' : cu?.side === 'כלה' ? 'כלה' : null;
    setGuestForm({ ...EMPTY_FORM, guest_group_id: groupId, side: defaultSide });
    setGuestDialogOpen(true);
  }, []);

  // 1) שמירת מודל אורח פתוח בזמן השמירה + spinner בתוך כפתור השמירה
  // 2) אחרי שמירה מוצלחת: הודעת הצלחה + פתיחת הקבוצה הרלוונטית + גלילה והדגשה של האורח

  /**
   * Scrolls to a guest row and briefly highlights it. Runs after the DOM had a
   * chance to re-render with the (possibly newly expanded) group open.
   */
  const focusGuestRow = useCallback((guestId: string) => {
    if (highlightTimeoutRef.current) {
      window.clearTimeout(highlightTimeoutRef.current);
    }

    setHighlightedGuestId(guestId);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = guestRowRefs.current.get(guestId);

        if (el) {
          const rect = el.getBoundingClientRect();

          window.scrollBy({
            top: rect.top - 120,
            behavior: 'smooth',
          });
        }
      });
    });

    highlightTimeoutRef.current = window.setTimeout(() => {
      setHighlightedGuestId(null);
      highlightTimeoutRef.current = null;
    }, 2600);
  }, []);

  useEffect(() => {
    setGuestDialogError(null);
  }, [guestDialogOpen]);

  async function handleSaveGuest() {
    if (!guestForm.first_name.trim() || !guestForm.last_name.trim() || !guestForm.phone.trim()) return;

    const wasEditing = !!editingGuest;
    const editedGuestId = editingGuest?.id ?? null;
    const firstName = guestForm.first_name.trim();
    const lastName = guestForm.last_name.trim();
    const phone = guestForm.phone.trim();
    const phoneDigits = phone.replace(/\D/g, '');
    const plusCount = guestForm.plus_count ?? 0;
    const giftAmount = guestForm.gift_amount ?? null;

    setSaving(true);
    try {
      if (editingGuest) {
        await updateGuest(editingGuest.id, {
          first_name: firstName,
          last_name: lastName,
          phone,
          side: guestForm.side,
          guest_group_id: guestForm.guest_group_id,
          plus_count: plusCount,
          gift_amount: giftAmount,
        });
      } else {
        await createGuest({
          wedding_id: info?.id ?? -1,
          first_name: firstName,
          last_name: lastName,
          phone,
          side: guestForm.side,
          guest_group_id: guestForm.guest_group_id,
          plus_count: guestForm.plus_count,
        });
      }

      const { nextGroups, nextGuests } = await reload();
      setGuestDialogOpen(false);

      // Locate the saved guest in the freshly-loaded list so we know exactly
      // which group to open and which row to scroll/highlight.
      const savedGuest = wasEditing
        ? nextGuests.find((g) => g.id === editedGuestId)
        : nextGuests.find((g) =>
          g.phone.replace(/\D/g, '') === phoneDigits &&
          g.first_name === firstName &&
          g.last_name === lastName
        );

      if (savedGuest) {
        const groupExists = nextGroups.some((g) => g.id === savedGuest.guest_group_id);
        const targetGroupKey = savedGuest.guest_group_id && groupExists
          ? savedGuest.guest_group_id
          : UNGROUPED_KEY;

        setExpandedGroups((prev) => {
          if (prev.has(targetGroupKey)) return prev;
          const next = new Set(prev);
          next.add(targetGroupKey);
          return next;
        });

        setSuccessMessage(
          wasEditing
            ? `הפרטים של ${firstName} ${lastName} עודכנו בהצלחה`
            : `${firstName} ${lastName} נוסף/ה לרשימת האורחים 🎉`
        );

        focusGuestRow(savedGuest.id);
      } else {
        setSuccessMessage(wasEditing ? 'האורח עודכן בהצלחה' : 'האורח נוסף בהצלחה');
      }
    } catch (e) {
      setGuestDialogError(
        'אורח זה כבר קיים ברשימת האורחים.'
      );

      setError(
        e instanceof Error
          ? e.message
          : 'שגיאה בשמירת אורח'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteGuest() {
    if (!deleteGuestId) return;

    setDeletingGuest(true);

    try {
      await deleteGuest(deleteGuestId);
      await reload();
      setDeleteGuestId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה במחיקת אורח');
    } finally {
      setDeletingGuest(false);
    }
  }

  const openDeleteGroup = useCallback((id: string) => {
    setDeleteGroupId(id);
  }, []);

  async function handleDeleteGroup() {
    if (!deleteGroupId) return;
    setSaving(true);
    try {
      await deleteGuestGroup(deleteGroupId);
      setDeleteGroupId(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה במחיקת קבוצה');
    } finally {
      setSaving(false);
    }
  }

  const handleExportExcel = () => {
    exportGuestsToExcel(allGuests, info ? `${info?.bride_name} & ${info?.groom_name}` : "", {
      totalGuests: allGuests.length,
      totalPeople: rsvpSummary.effectiveTotalPeople,
      coming: rsvpSummary.coming,
      notComing: rsvpSummary.notComing,
      pending: rsvpSummary.pending,
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress sx={{ color: '#C9A84C' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2.5 } }}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          position: 'sticky',
          zIndex: 10,
          borderRadius: 2.5,
          mb: 2,
          p: 1.25,
          background: 'linear-gradient(145deg, rgba(255,252,245,0.94), rgba(249,240,220,0.94))',
          border: '1px solid rgba(201,168,76,0.28)',
          boxShadow: '0 5px 18px rgba(154,120,51,0.10)',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ md: 'center' }}>
          <TextField
            size="small"
            fullWidth
            placeholder="חיפוש אורח לפי שם / טלפון / קבוצה"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#A08070' }} />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch('')} edge="end" sx={{ color: '#A08070', '&:hover': { color: '#2C1810' } }}>
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ) : undefined,
            }}
          />

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<GroupAddIcon />}
              onClick={openCreateGroup}
              sx={{
                borderColor: 'rgba(201,168,76,0.5)',
                color: '#9A7833',
                fontWeight: 700,
                fontSize: "14px"
              }}
            >
              קבוצה חדשה
            </Button>
            <Button
              variant="contained"
              startIcon={<PersonAddAlt1Icon />}
              onClick={() => openCreateGuest(null)}
              sx={{
                background: 'linear-gradient(135deg, #E0C97A, #C9A84C)',
                color: '#2C1810',
                fontWeight: 700,
                fontSize: "14px",
                '&:hover': { background: 'linear-gradient(135deg, #E8D490, #D4A855)' },
              }}
            >
              הוסף אורח
            </Button>
          </Stack>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} mt={2}>
          <TextField
            select
            size="small"
            label="סינון לפי סטטוס הגעה"
            value={rsvpFilter}
            onChange={(e) => setRsvpFilter(e.target.value as RsvpFilter)}
            sx={{ minWidth: { xs: '100%', sm: 180 } }}
          >
            <MenuItem value="ALL">הכל</MenuItem>
            <MenuItem value="PENDING">ממתינים</MenuItem>
            <MenuItem value="COMING">מגיעים</MenuItem>
            <MenuItem value="NOT_COMING">לא מגיעים</MenuItem>
          </TextField>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleExportExcel}
            sx={{
              background: 'linear-gradient(135deg,#217346,#2ea043)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '13px',
              padding: "6px 16px",
              '&:hover': {
                background: 'linear-gradient(135deg,#1b5f39,#24843a)',
              },
            }}
          >
            ייצוא לאקסל
          </Button>
        </Stack>

        <Stack direction="row" spacing={0} mt={1.2} gap={1} ml={1} mb={0.2} flexWrap="wrap">
          <Chip size="small" label={`${processedGuests.length} מוצגים`} sx={{ bgcolor: 'rgba(201,168,76,0.18)', color: '#8A6A2B' }} />
          {processedGuests.length !== allGuests.length && (
            <Chip size="small" label={`מתוך ${allGuests.length} אורחים`} sx={{ bgcolor: 'rgba(201,168,76,0.11)', color: '#9A7833' }} />
          )}
          <Chip size="small" label={`${groups.length} קבוצות`} sx={{ bgcolor: 'rgba(154,120,51,0.13)', color: '#8A6A2B' }} />
          {rsvpSummary.effectiveTotalPeople > allGuests.length && (
            <Chip
              size="small"
              icon={<PeopleAltIcon sx={{ fontSize: 14 }} />}
              label={`סה"כ ${rsvpSummary.effectiveTotalPeople} אנשים`}
              sx={{ bgcolor: 'rgba(79,134,247,0.13)', color: '#3A6AD4', fontWeight: 700 }}
            />
          )}
          <Chip
            size="small"
            label={
              `${rsvpSummary.coming} אישרו`
            }
            sx={{ bgcolor: 'rgba(46,139,87,0.14)', color: '#2E8B57', border: '1px solid rgba(46,139,87,0.3)', fontWeight: 700 }}
            onClick={() => handleOpenRsvpList('COMING')}
            clickable
          />
          <Chip
            size="small"
            label={
              `${rsvpSummary.notComing} סירבו`
            }
            sx={{ bgcolor: 'rgba(185,71,61,0.13)', color: '#B9473D', border: '1px solid rgba(185,71,61,0.3)', fontWeight: 700 }}
            onClick={() => handleOpenRsvpList('NOT_COMING')}
            clickable
          />
          <Chip
            size="small"
            label={`${rsvpSummary.pending} טרם אישרו`
            }
            sx={{ bgcolor: 'rgba(140,140,140,0.14)', color: '#6C6C6C', border: '1px solid rgba(140,140,140,0.3)', fontWeight: 700 }}
            onClick={() => handleOpenRsvpList('PENDING')}
            clickable
          />
        </Stack>
      </Box>

      {searchLoading ? (
        <Box sx={{ mt: 1 }}>
          {[...Array(5)].map((_, i) => (
            <Box
              key={i}
              sx={{
                mb: 1.5,
                borderRadius: '14px',
                overflow: 'hidden',
                border: '1px solid rgba(201,168,76,0.2)',
              }}
            >
              <Box sx={{ px: 1.5, py: 1.2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Skeleton variant="text" width={120 + i * 18} height={22} sx={{ borderRadius: 1 }} />
                <Skeleton variant="rounded" width={60} height={20} sx={{ borderRadius: 10 }} />
              </Box>
            </Box>
          ))}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, gap: 1, alignItems: 'center' }}>
            <CircularProgress size={16} thickness={4} sx={{ color: '#C9A84C' }} />
            <Typography variant="caption" sx={{ color: '#A08070' }}>מחפש אורחים...</Typography>
          </Box>
        </Box>
      ) : (
        <>
          {groups.map((group) => (
            <GroupAccordionItem
              key={group.id}
              weddingId={info?.id ?? -1}
              groupId={group.id}
              name={group.name}
              items={grouped.map.get(group.id) ?? []}
              expanded={expandedGroups.has(group.id)}
              onToggle={toggleGroup}
              group={group}
              onEditGroup={openEditGroup}
              onDeleteGroup={openDeleteGroup}
              onCreateGuest={openCreateGuest}
              onEditGuest={handleEditGuestOpen}
              onDeleteGuest={handleDeleteGuestOpen}
              onSendInvitation={handleSendInvitation}
              registerGuestRef={registerGuestRef}
              highlightedGuestId={highlightedGuestId}
            />
          ))}

          <GroupAccordionItem
            groupId={UNGROUPED_KEY}
            weddingId={info?.id ?? -1}
            name="ללא קבוצה"
            items={grouped.ungrouped}
            expanded={expandedGroups.has(UNGROUPED_KEY)}
            onToggle={toggleGroup}
            isUngrouped
            onCreateGuest={openCreateGuest}
            onEditGuest={handleEditGuestOpen}
            onDeleteGuest={handleDeleteGuestOpen}
            onSendInvitation={handleSendInvitation}
            registerGuestRef={registerGuestRef}
            highlightedGuestId={highlightedGuestId}
          />
        </>
      )}

      <Dialog open={groupDialogOpen} onClose={() => setGroupDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 700 }}>
          {editingGroup ? 'עריכת קבוצה' : 'קבוצה חדשה'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="שם קבוצה"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            autoFocus
            size="small"
            sx={{ mt: 0.5 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupDialogOpen(false)} sx={{ color: '#A08070' }}>ביטול</Button>
          <Button onClick={handleSaveGroup} disabled={saving || !groupName.trim()} sx={{ color: '#9A7833', fontWeight: 700, minWidth: 84 }}>
            {saving ? <CircularProgress size={18} thickness={5} sx={{ color: '#9A7833' }} /> : 'שמירה'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={guestDialogOpen} onClose={() => setGuestDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 700 }}>
          {editingGuest ? 'עריכת אורח' : 'הוספת אורח'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={1.25} sx={{ mt: 0.5 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
              <TextField
                fullWidth
                label="שם פרטי"
                value={guestForm.first_name}
                onChange={(e) => setGuestForm((p) => ({ ...p, first_name: e.target.value }))}
                size="small"
              />
              <TextField
                fullWidth
                label="שם משפחה"
                value={guestForm.last_name}
                onChange={(e) => setGuestForm((p) => ({ ...p, last_name: e.target.value }))}
                size="small"
              />
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
              <TextField
                fullWidth
                label="טלפון"
                value={guestForm.phone}
                onChange={(e) => setGuestForm((p) => ({ ...p, phone: e.target.value }))}
                size="small"
              />
              <TextField
                select
                fullWidth
                label="צד"
                value={guestForm.side ?? ''}
                onChange={(e) => setGuestForm((p) => ({ ...p, side: (e.target.value || null) as SideOption }))}
                size="small"
              >
                <MenuItem value="">לא נבחר</MenuItem>
                <MenuItem value="חתן">חתן</MenuItem>
                <MenuItem value="כלה">כלה</MenuItem>
                <MenuItem value="שניהם">שניהם</MenuItem>
              </TextField>
            </Stack>

            <TextField
              select
              fullWidth
              label="קבוצת על"
              value={guestForm.guest_group_id ?? ''}
              onChange={(e) => setGuestForm((p) => ({ ...p, guest_group_id: e.target.value || null }))}
              size="small"
            >
              <MenuItem value="">ללא קבוצה</MenuItem>
              {groups.map((g) => (
                <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
              ))}
            </TextField>

            {/* Plus count stepper */}
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 1,
              p: 1.25, borderRadius: 2,
              background: 'rgba(201,168,76,0.07)',
              border: '1px solid rgba(201,168,76,0.22)',
            }}>
              <PeopleAltIcon sx={{ color: '#9A7833', fontSize: 20 }} />
              <Typography variant="body2" sx={{ color: '#6B5240', flex: 1, fontWeight: 600 }}>
                צפוי להגיע עם אורחים נוספים:
              </Typography>
              <IconButton
                size="small"
                onClick={() => setGuestForm((p) => ({ ...p, plus_count: Math.max(0, p.plus_count - 1) }))}
                disabled={guestForm.plus_count === 0}
              >
                <RemoveCircleOutlineIcon sx={{ fontSize: 22, color: guestForm.plus_count === 0 ? '#C8B89A' : '#C9A84C' }} />
              </IconButton>
              <Typography sx={{ minWidth: 36, textAlign: 'center', fontWeight: 800, fontSize: '1.1rem', color: '#2C1810' }}>
                {guestForm.plus_count === 0 ? '—' : `+${guestForm.plus_count}`}
              </Typography>
              <IconButton
                size="small"
                onClick={() => setGuestForm((p) => ({ ...p, plus_count: Math.min(20, p.plus_count + 1) }))}
              >
                <AddCircleOutlineIcon sx={{ fontSize: 22, color: '#C9A84C' }} />
              </IconButton>
              {guestForm.plus_count > 0 && (
                <Typography variant="caption" sx={{ color: '#9A7833', fontWeight: 600, mr: 0.5 }}>
                  {1 + guestForm.plus_count} אנשים בסה"כ
                </Typography>
              )}
            </Box>
            <Stack direction={{ xs: 'column', sm: 'column' }} spacing={1.25}>
              <Typography variant="caption" sx={{ color: '#9A7833', fontWeight: 600, marginLeft: "2px !important", marginBottom: "3px !important" }}>
                מתנה מהאורח
              </Typography>
              <TextField
                sx={{ marginTop: '6px !important' }}
                fullWidth
                label='סכום מתנה בש"ח'
                value={guestForm.gift_amount}
                onChange={(e) => setGuestForm((p) => ({ ...p, gift_amount: Number(e.target.value) }))}
                size="small"
                type="number"
              />
            </Stack>
            {guestDialogError && (
              <Alert
                severity="error"
                sx={{
                  mb: 2,
                  borderRadius: 2,
                }}
              >
                {guestDialogError}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGuestDialogOpen(false)} sx={{ color: '#A08070' }}>ביטול</Button>
          <Button
            onClick={handleSaveGuest}
            disabled={saving || !guestForm.first_name.trim() || !guestForm.last_name.trim() || !guestForm.phone.trim()}
            sx={{ color: '#9A7833', fontWeight: 700, minWidth: 84 }}
          >
            {saving ? <CircularProgress size={18} thickness={5} sx={{ color: '#9A7833' }} /> : 'שמירה'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteGuestId !== null}
        onClose={deletingGuest ? undefined : () => setDeleteGuestId(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 700 }}>מחיקת אורח</DialogTitle>
        <DialogContent>
          <Typography variant="body2">למחוק את האורח מהרשימה?</Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteGuestId(null)}
            disabled={deletingGuest}
            sx={{ color: '#A08070' }}
          >
            ביטול
          </Button>
          <Button
            onClick={handleDeleteGuest}
            disabled={deletingGuest}
            sx={{
              color: '#C04040',
              fontWeight: 700,
              minWidth: 84,
            }}
          >
            {deletingGuest ? (
              <CircularProgress
                size={18}
                thickness={5}
                sx={{ color: '#C04040' }}
              />
            ) : (
              'מחק'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteGroupId !== null} onClose={() => setDeleteGroupId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 700 }}>מחיקת קבוצה</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>
            למחוק את הקבוצה?
          </Typography>
          <Typography variant="caption" sx={{ color: '#A08070' }}>
            האורחים בקבוצה לא יימחקו, אלא יעברו ל"ללא קבוצה".
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteGroupId(null)} sx={{ color: '#A08070' }}>ביטול</Button>
          <Button onClick={handleDeleteGroup} sx={{ color: '#C04040', fontWeight: 700 }} disabled={saving}>מחק</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={rsvpListStatus !== null} onClose={() => setRsvpListStatus(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 700 }}>
          {rsvpListTitle}
        </DialogTitle>
        <DialogContent>
          <Typography variant="caption" sx={{ color: '#8A7565', display: 'block', mb: 1.1 }}>
            {rsvpListGuests.length} אורחים · {rsvpListPeopleCount} אנשים
          </Typography>

          {rsvpListGuests.length === 0 ? (
            <Typography variant="body2" sx={{ color: '#A08070', fontStyle: 'italic' }}>
              אין אורחים להצגה כרגע.
            </Typography>
          ) : (
            <Stack spacing={0.8}>
              {rsvpListGuests.map((guest) => {
                const plus = getEffectivePlusCount(guest);
                return (
                  <Box
                    key={guest.id}
                    sx={{
                      border: '1px solid rgba(201,168,76,0.2)',
                      borderRadius: 2,
                      px: 1.2,
                      py: 0.85,
                      background: 'rgba(255,255,255,0.72)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                    }}
                  >
                    <Box>
                      <Typography sx={{ color: '#2C1810', fontWeight: 700, lineHeight: 1.2 }}>
                        {guest.first_name} {guest.last_name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#8E7460' }}>
                        {guest.phone}
                      </Typography>
                    </Box>

                    {plus > 0 ? (
                      <Chip
                        size="small"
                        label={`+${plus}`}
                        sx={{
                          height: 22,
                          fontSize: '0.7rem',
                          bgcolor: 'rgba(154,120,51,0.15)',
                          color: '#7A5C1E',
                          fontWeight: 700,
                        }}
                      />
                    ) : null}
                  </Box>
                );
              })}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRsvpListStatus(null)} sx={{ color: '#A08070' }}>
            סגירה
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success feedback after a guest is added/updated */}
      <Snackbar
        open={successMessage !== null}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSuccessMessage(null)}
          severity="success"
          variant="filled"
          icon={<CheckCircleIcon fontSize="small" />}
          sx={{
            borderRadius: 2,
            fontWeight: 700,
            boxShadow: '0 6px 20px rgba(46,139,87,0.35)',
            background: 'linear-gradient(135deg,#2E8B57,#3CA96B)',
          }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Box >
  );
}

/**
 * Memoized so that toggling one accordion (which updates `expandedGroups` in the
 * parent) doesn't force every other group's guest rows / chip labels to recompute.
 * `items` comes from the already-memoized `grouped` map, so its reference stays
 * stable across re-renders that don't actually change membership.
 */
const GroupAccordionItem = memo(function GroupAccordionItem({
  groupId,
  weddingId,
  name,
  items,
  expanded,
  onToggle,
  isUngrouped,
  group,
  onEditGroup,
  onDeleteGroup,
  onCreateGuest,
  onEditGuest,
  onDeleteGuest,
  onSendInvitation,
  registerGuestRef,
  highlightedGuestId,
}: {
  groupId: string;
  weddingId: number;
  name: string;
  items: ManagedGuest[];
  expanded: boolean;
  onToggle: (id: string) => void;
  isUngrouped?: boolean;
  group?: GuestGroup;
  onEditGroup?: (group: GuestGroup) => void;
  onDeleteGroup?: (id: string) => void;
  onCreateGuest: (groupId: string | null) => void;
  onEditGuest: (guest: ManagedGuest) => void;
  onDeleteGuest: (id: string) => void;
  onSendInvitation: (guest: ManagedGuest) => void;
  registerGuestRef: (id: string, el: HTMLDivElement | null) => void;
  highlightedGuestId: string | null;
}) {
  const handleChange = useCallback(() => onToggle(groupId), [onToggle, groupId]);
  const handleCreateGuest = useCallback(
    (e: React.MouseEvent) => { e.stopPropagation(); onCreateGuest(isUngrouped ? null : groupId); },
    [onCreateGuest, isUngrouped, groupId]
  );

  return (
    <Accordion
      disableGutters
      expanded={expanded}
      onChange={handleChange}
      TransitionProps={{ timeout: 180 }}
      sx={{
        mb: isUngrouped ? 1.25 : 1.5,
        borderRadius: '14px !important',
        overflow: 'hidden',
        border: `1px solid rgba(201,168,76,${isUngrouped ? 0.2 : 0.26})`,
        boxShadow: `0 ${isUngrouped ? 3 : 4}px ${isUngrouped ? 10 : 14}px rgba(154,120,51,${isUngrouped ? 0.06 : 0.08})`,
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ fontSize: 18, color: '#9A7833' }} />}
        sx={{ '& .MuiAccordionSummary-content': { minWidth: 0, my: '10px' } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', minWidth: 0, gap: 0.75 }}>
          {/* Info */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: '1 1 auto', minWidth: 0 }}>
            <Typography sx={{
              color: '#2C1810', fontWeight: 700,
              fontSize: { xs: '0.8rem', sm: '0.9rem' },
              width: { xs: 110, sm: 170 },
              flexShrink: 0,
              wordBreak: 'break-word', lineHeight: 1.3,
            }}>{name}</Typography>
            <Chip
              size="small"
              label={computeGroupChipLabel(items)}
              sx={{
                bgcolor: `rgba(201,168,76,${isUngrouped ? 0.10 : 0.14})`,
                color: '#9A7833',
                height: 'auto',
                flexShrink: 0,
                '& .MuiChip-label': { py: 0.25, px: 0.75 },
              }}
            />
          </Box>
          {/* Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, width: 120, justifyContent: 'flex-end' }}>
            {!isUngrouped && group && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Tooltip title="עריכת שם קבוצה">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEditGroup?.(group); }}>
                      <EditIcon sx={{ fontSize: 16, color: '#A08070' }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="מחיקת קבוצה">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDeleteGroup?.(groupId); }}>
                      <DeleteOutlineIcon sx={{ fontSize: 16, color: '#C04040' }} />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Box sx={{ width: '1px', height: 18, bgcolor: 'rgba(201,168,76,0.35)', mx: 1, flexShrink: 0 }} />
              </>
            )}
            <Button
              size="small"
              onClick={handleCreateGuest}
              sx={{ color: '#9A7833', fontWeight: 700, fontSize: '0.75rem', minWidth: 0, px: 0.7, lineHeight: 1 }}
            >
              + אורח
            </Button>
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0.5 }}>
        {items.length === 0 ? (
          <Typography variant="body2" sx={{ color: '#A08070', fontStyle: 'italic', py: 0.75 }}>
            {isUngrouped ? 'כל האורחים משויכים לקבוצות.' : 'אין אורחים בקבוצה הזו עדיין.'}
          </Typography>
        ) : (
          <Stack spacing={0.8}>
            {items.map((guest) => (
              <GuestRow
                key={guest.id}
                weddingId={weddingId}
                guest={guest}
                onEdit={onEditGuest}
                onDelete={onDeleteGuest}
                onSendInvitation={onSendInvitation}
                registerRef={registerGuestRef}
                highlighted={highlightedGuestId === guest.id}
              />
            ))}
          </Stack>
        )}
      </AccordionDetails>
    </Accordion>
  );
});

const GuestRow = memo(function GuestRow({
  guest,
  weddingId,
  onEdit,
  onDelete,
  onSendInvitation,
  registerRef,
  highlighted,
}: {
  guest: ManagedGuest;
  weddingId: number;
  onEdit: (guest: ManagedGuest) => void;
  onDelete: (id: string) => void;
  onSendInvitation: (guest: ManagedGuest) => void;
  registerRef: (id: string, el: HTMLDivElement | null) => void;
  highlighted: boolean;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopyLink() {
    const phone = guest.phone.replace(/\D/g, '');
    const last4 = phone.slice(-4);
    const url = buildGuestUrl(`${guest.first_name} ${guest.last_name}`, last4, weddingId);
    navigator.clipboard.writeText(url).then(() => setCopied(true));
  }

  const rsvpMeta = getRsvpMeta(guest.rsvp_status, guest.number_of_guests);
  const updatedAtLabel = formatRsvpUpdatedAt(guest.rsvp_updated_at);

  return (
    <Box
      ref={(el: HTMLDivElement | null) => registerRef(guest.id, el)}
      sx={{
        border: highlighted ? '1px solid rgba(46,139,87,0.55)' : '1px solid rgba(201,168,76,0.18)',
        borderRadius: 2,
        px: 1.2,
        py: 0.9,
        background: highlighted ? 'rgba(46,139,87,0.10)' : 'rgba(255,255,255,0.7)',
        boxShadow: highlighted ? '0 0 0 3px rgba(46,139,87,0.18)' : 'none',
        transition: 'background-color 0.6s ease, box-shadow 0.6s ease, border-color 0.6s ease',
      }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography sx={{ color: '#2C1810', fontWeight: 700, lineHeight: 1.2 }}>
            {guest.first_name} {guest.last_name}
          </Typography>
          <Stack direction="row" spacing={0.8} alignItems="center" flexWrap="wrap" mt={0.35}>
            <Typography variant="caption" sx={{ color: '#8E7460' }}>{guest.phone}</Typography>
            {guest.side && <Chip size="small" label={guest.side} sx={{ height: 20, fontSize: '0.68rem' }} />}
            {(guest.rsvp_status === 'PENDING' || guest.rsvp_status === 'NOT_COMING') && getInvitedPartySize(guest) - 1 > 0 && (
              <Chip
                size="small"
                label={`+${getInvitedPartySize(guest) - 1}`}
                sx={{ height: 20, fontSize: '0.68rem', bgcolor: 'rgba(154,120,51,0.15)', color: '#7A5C1E', fontWeight: 700 }}
              />
            )}
            <Chip
              size="small"
              label={rsvpMeta.label}
              sx={{
                height: 20,
                fontSize: '0.68rem',
                bgcolor: rsvpMeta.bg,
                color: rsvpMeta.color,
                border: `1px solid ${rsvpMeta.border}`,
                fontWeight: 800,
              }}
            />
            {guest.table_number && (
              <Chip
                size="small"
                icon={<TableRestaurantIcon sx={{ fontSize: 13 }} />}
                label={`שולחן ${guest.table_number}`}
                sx={{ height: 20, fontSize: '0.68rem' }}
              />
            )}
            {updatedAtLabel && (
              <Typography variant="caption" sx={{ color: '#9D8A7A' }}>
                עודכן: {updatedAtLabel}
              </Typography>
            )}
          </Stack>
        </Box>

        <Stack direction="row" spacing={0.32}>
          <Tooltip title="שליחת הזמנה">
            <Button
              size="small"
              variant="outlined"
              startIcon={<WhatsAppIcon sx={{ fontSize: 16 }} />}
              onClick={() => onSendInvitation(guest)}
              sx={{
                minWidth: 0,
                px: 1,
                borderRadius: 2,
                borderColor: 'rgba(37,211,102,0.55)',
                color: '#1f9f51',
                fontWeight: 700,
                fontSize: '0.67rem',
                '&:hover': {
                  borderColor: '#1f9f51',
                  background: 'rgba(37,211,102,0.08)',
                },
              }}
            >
              שליחת הזמנה
            </Button>
          </Tooltip>
          <Tooltip title="העתק קישור כניסה">
            <IconButton size="small" onClick={handleCopyLink}>
              <LinkIcon sx={{ fontSize: 18, color: copied ? '#4caf50' : '#A08070' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="עריכה">
            <IconButton size="small" onClick={() => onEdit(guest)}>
              <EditIcon sx={{ fontSize: 18, color: '#A08070' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="מחיקה">
            <IconButton size="small" onClick={() => onDelete(guest.id)}>
              <DeleteOutlineIcon sx={{ fontSize: 18, color: '#C04040' }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      <Snackbar
        open={copied}
        autoHideDuration={2200}
        onClose={() => setCopied(false)}
        message="הקישור הועתק ללוח"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
});