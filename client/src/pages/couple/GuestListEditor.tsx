import { useEffect, useMemo, useState } from 'react';
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
import { AnimatePresence, motion } from 'framer-motion';
import { buildGuestUrl } from '../../utils/guestUrl';

import { GuestGroup, ManagedGuest } from '../../types/domain';
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

type SideOption = 'חתן' | 'כלה' | 'שניהם' | null;

type GuestForm = {
  first_name: string;
  last_name: string;
  phone: string;
  side: SideOption;
  guest_group_id: string | null;
  plus_count: number;
};

const EMPTY_FORM: GuestForm = {
  first_name: '',
  last_name: '',
  phone: '',
  side: null,
  guest_group_id: null,
  plus_count: 0,
};

export default function GuestListEditor() {
  const currentUser = useAppSelector((state) => state.auth.guest);
  const [groups, setGroups] = useState<GuestGroup[]>([]);
  const [guests, setGuests] = useState<ManagedGuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');

  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GuestGroup | null>(null);
  const [groupName, setGroupName] = useState('');

  const [guestDialogOpen, setGuestDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<ManagedGuest | null>(null);
  const [guestForm, setGuestForm] = useState<GuestForm>(EMPTY_FORM);

  const [deleteGuestId, setDeleteGuestId] = useState<string | null>(null);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function reload() {
    const [nextGroups, nextGuests] = await Promise.all([getGuestGroups(), getGuests(search)]);
    setGroups(nextGroups);
    setGuests(nextGuests);
  }

  useEffect(() => {
    reload()
      .catch(() => setError('שגיאה בטעינת רשימת אורחים'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      getGuests(search)
        .then(setGuests)
        .catch(() => setError('שגיאה בסינון רשימת אורחים'));
    }, 250);

    return () => clearTimeout(t);
  }, [search]);

  const grouped = useMemo(() => {
    const map = new Map<string, ManagedGuest[]>();

    for (const g of groups) {
      map.set(g.id, []);
    }

    const ungrouped: ManagedGuest[] = [];
    for (const guest of guests) {
      if (guest.guest_group_id && map.has(guest.guest_group_id)) {
        map.get(guest.guest_group_id)!.push(guest);
      } else {
        ungrouped.push(guest);
      }
    }

    return { map, ungrouped };
  }, [groups, guests]);

  function openCreateGroup() {
    setEditingGroup(null);
    setGroupName('');
    setGroupDialogOpen(true);
  }

  function openEditGroup(group: GuestGroup) {
    setEditingGroup(group);
    setGroupName(group.name);
    setGroupDialogOpen(true);
  }

  async function handleSaveGroup() {
    if (!groupName.trim()) return;
    setSaving(true);
    try {
      if (editingGroup) {
        await updateGuestGroup(editingGroup.id, groupName.trim());
      } else {
        await createGuestGroup(groupName.trim());
      }
      setGroupDialogOpen(false);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בשמירת קבוצה');
    } finally {
      setSaving(false);
    }
  }

  function openCreateGuest(groupId: string | null = null) {
    setEditingGuest(null);
    const defaultSide: SideOption = currentUser?.side === 'חתן' ? 'חתן' : currentUser?.side === 'כלה' ? 'כלה' : null;
    setGuestForm({ ...EMPTY_FORM, guest_group_id: groupId, side: defaultSide });
    setGuestDialogOpen(true);
  }

  function openEditGuest(guest: ManagedGuest) {
    setEditingGuest(guest);
    setGuestForm({
      first_name: guest.first_name ?? '',
      last_name: guest.last_name ?? '',
      phone: guest.phone,
      side: guest.side,
      guest_group_id: guest.guest_group_id,
      plus_count: guest.plus_count ?? 0,
    });
    setGuestDialogOpen(true);
  }

  async function handleSaveGuest() {
    if (!guestForm.first_name.trim() || !guestForm.last_name.trim() || !guestForm.phone.trim()) return;

    setSaving(true);
    try {
      if (editingGuest) {
        await updateGuest(editingGuest.id, {
          first_name: guestForm.first_name.trim(),
          last_name: guestForm.last_name.trim(),
          phone: guestForm.phone.trim(),
          side: guestForm.side,
          guest_group_id: guestForm.guest_group_id,
          plus_count: guestForm.plus_count,
        });
      } else {
        await createGuest({
          first_name: guestForm.first_name.trim(),
          last_name: guestForm.last_name.trim(),
          phone: guestForm.phone.trim(),
          side: guestForm.side,
          guest_group_id: guestForm.guest_group_id,
          plus_count: guestForm.plus_count,
        });
      }
      setGuestDialogOpen(false);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בשמירת אורח');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteGuest() {
    if (!deleteGuestId) return;
    setSaving(true);
    try {
      await deleteGuest(deleteGuestId);
      setDeleteGuestId(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה במחיקת אורח');
    } finally {
      setSaving(false);
    }
  }

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

        <Stack direction="row" spacing={1} mt={1} ml={1} flexWrap="wrap">
          <Chip size="small" label={`${guests.length} אורחים רשומים`} sx={{ bgcolor: 'rgba(201,168,76,0.18)', color: '#8A6A2B' }} />
          <Chip size="small" label={`${groups.length} קבוצות`} sx={{ bgcolor: 'rgba(154,120,51,0.13)', color: '#8A6A2B' }} />
          {(() => {
            const total = guests.reduce((s, g) => s + 1 + (g.plus_count ?? 0), 0);
            return total > guests.length ? (
              <Chip
                size="small"
                icon={<PeopleAltIcon sx={{ fontSize: 14 }} />}
                label={`סה"כ ${total} אנשים`}
                sx={{ bgcolor: 'rgba(79,134,247,0.13)', color: '#3A6AD4', fontWeight: 700 }}
              />
            ) : null;
          })()}
        </Stack>
      </Box>

      <AnimatePresence>
        {groups.map((group) => {
          const items = grouped.map.get(group.id) ?? [];
          return (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <Accordion
                disableGutters
                sx={{
                  mb: 1.5,
                  borderRadius: '14px !important',
                  overflow: 'hidden',
                  border: '1px solid rgba(201,168,76,0.26)',
                  boxShadow: '0 4px 14px rgba(154,120,51,0.08)',
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
                      }}>{group.name}</Typography>
                      <Chip
                        size="small"
                        label={(() => {
                          const total = items.reduce((s, g) => s + 1 + (g.plus_count ?? 0), 0);
                          if (total > items.length) {
                            return (
                              <Box component="span" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '0.65rem', lineHeight: 1.5, padding: "2px 4px" }}>
                                <span>{items.length} רשומים</span>
                                <span>{total} בסה"כ</span>
                              </Box>
                            );
                          }
                          return `${items.length} אורחים`;
                        })()}
                        sx={{ bgcolor: 'rgba(201,168,76,0.14)', color: '#9A7833', height: 'auto', flexShrink: 0, '& .MuiChip-label': { py: 0.25, px: 0.75 } }}
                      />
                    </Box>
                    {/* Actions */}
                    <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, width: 118, justifyContent: 'flex-end' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Tooltip title="עריכת שם קבוצה">
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); openEditGroup(group); }}>
                            <EditIcon sx={{ fontSize: 14, color: '#A08070' }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="מחיקת קבוצה">
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setDeleteGroupId(group.id); }}>
                            <DeleteOutlineIcon sx={{ fontSize: 14, color: '#C04040' }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Box sx={{ width: '1px', height: 18, bgcolor: 'rgba(201,168,76,0.35)', mx: 1, flexShrink: 0 }} />
                      <Button
                        size="small"
                        onClick={(e) => { e.stopPropagation(); openCreateGuest(group.id); }}
                        sx={{ color: '#9A7833', fontWeight: 700, fontSize: '0.7rem', minWidth: 0, px: 0.5, lineHeight: 1 }}
                      >
                        + אורח
                      </Button>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0.5 }}>
                  {items.length === 0 ? (
                    <Typography variant="body2" sx={{ color: '#A08070', fontStyle: 'italic', py: 0.75 }}>
                      אין אורחים בקבוצה הזו עדיין.
                    </Typography>
                  ) : (
                    <Stack spacing={0.8}>
                      {items.map((guest) => (
                        <GuestRow
                          key={guest.id}
                          guest={guest}
                          onEdit={() => openEditGuest(guest)}
                          onDelete={() => setDeleteGuestId(guest.id)}
                        />
                      ))}
                    </Stack>
                  )}
                </AccordionDetails>
              </Accordion>
            </motion.div>
          );
        })}
      </AnimatePresence>

      <Accordion
        disableGutters
        sx={{
          mb: 1.25,
          borderRadius: '14px !important',
          overflow: 'hidden',
          border: '1px solid rgba(201,168,76,0.2)',
          boxShadow: '0 3px 10px rgba(154,120,51,0.06)',
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
              }}>ללא קבוצה</Typography>
              <Chip
                size="small"
                label={(() => {
                  const total = grouped.ungrouped.reduce((s, g) => s + 1 + (g.plus_count ?? 0), 0);
                  if (total > grouped.ungrouped.length) {
                    return (
                      <Box component="span" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '0.63rem', lineHeight: 1.3 }}>
                        <span>{grouped.ungrouped.length} רשומים</span>
                        <span>{total} בסה"כ</span>
                      </Box>
                    );
                  }
                  return `${grouped.ungrouped.length} אורחים`;
                })()}
                sx={{ bgcolor: 'rgba(201,168,76,0.10)', color: '#9A7833', height: 'auto', flexShrink: 0, '& .MuiChip-label': { py: 0.25, px: 0.75 } }}
              />
            </Box>
            {/* Actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, width: 118, justifyContent: 'flex-end' }}>
              <Button size="small" onClick={(e) => { e.stopPropagation(); openCreateGuest(null); }} sx={{ color: '#9A7833', fontWeight: 700, fontSize: '0.7rem', minWidth: 0, px: 0.5, lineHeight: 1 }}>
                + אורח
              </Button>
            </Box>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0.5 }}>
          {grouped.ungrouped.length === 0 ? (
            <Typography variant="body2" sx={{ color: '#A08070', fontStyle: 'italic', py: 0.75 }}>
              כל האורחים משויכים לקבוצות.
            </Typography>
          ) : (
            <Stack spacing={0.8}>
              {grouped.ungrouped.map((guest) => (
                <GuestRow
                  key={guest.id}
                  guest={guest}
                  onEdit={() => openEditGuest(guest)}
                  onDelete={() => setDeleteGuestId(guest.id)}
                />
              ))}
            </Stack>
          )}
        </AccordionDetails>
      </Accordion>

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
          <Button onClick={handleSaveGroup} disabled={saving || !groupName.trim()} sx={{ color: '#9A7833', fontWeight: 700 }}>
            שמירה
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
                מגיע עם אורחים נוספים:
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGuestDialogOpen(false)} sx={{ color: '#A08070' }}>ביטול</Button>
          <Button
            onClick={handleSaveGuest}
            disabled={saving || !guestForm.first_name.trim() || !guestForm.last_name.trim() || !guestForm.phone.trim()}
            sx={{ color: '#9A7833', fontWeight: 700 }}
          >
            שמירה
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteGuestId !== null} onClose={() => setDeleteGuestId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 700 }}>מחיקת אורח</DialogTitle>
        <DialogContent>
          <Typography variant="body2">למחוק את האורח מהרשימה?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteGuestId(null)} sx={{ color: '#A08070' }}>ביטול</Button>
          <Button onClick={handleDeleteGuest} sx={{ color: '#C04040', fontWeight: 700 }} disabled={saving}>מחק</Button>
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
    </Box>
  );
}

function GuestRow({
  guest,
  onEdit,
  onDelete,
}: {
  guest: ManagedGuest;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function handleCopyLink() {
    const phone = guest.phone.replace(/\D/g, '');
    const last4 = phone.slice(-4);
    const url = buildGuestUrl(`${guest.first_name} ${guest.last_name}`, last4);
    navigator.clipboard.writeText(url).then(() => setCopied(true));
  }

  return (
    <Box
      sx={{
        border: '1px solid rgba(201,168,76,0.18)',
        borderRadius: 2,
        px: 1.2,
        py: 0.9,
        background: 'rgba(255,255,255,0.7)',
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
            {guest.plus_count > 0 && (
              <Chip
                size="small"
                label={`+${guest.plus_count}`}
                sx={{ height: 20, fontSize: '0.68rem', bgcolor: 'rgba(154,120,51,0.15)', color: '#7A5C1E', fontWeight: 700 }}
              />
            )}
            {guest.table_number && (
              <Chip
                size="small"
                icon={<TableRestaurantIcon sx={{ fontSize: 13 }} />}
                label={`שולחן ${guest.table_number}`}
                sx={{ height: 20, fontSize: '0.68rem' }}
              />
            )}
          </Stack>
        </Box>

        <Stack direction="row" spacing={0.3}>
          <Tooltip title="העתק קישור כניסה">
            <IconButton size="small" onClick={handleCopyLink}>
              <LinkIcon sx={{ fontSize: 17, color: copied ? '#4caf50' : '#A08070' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="עריכה">
            <IconButton size="small" onClick={onEdit}>
              <EditIcon sx={{ fontSize: 17, color: '#A08070' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="מחיקה">
            <IconButton size="small" onClick={onDelete}>
              <DeleteOutlineIcon sx={{ fontSize: 17, color: '#C04040' }} />
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
}
