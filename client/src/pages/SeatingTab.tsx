import { useState, useEffect } from 'react';
import {
  Box, Typography, Chip, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, Divider, IconButton,
  List, ListItem, ListItemText, ListItemIcon,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import StarIcon from '@mui/icons-material/Star';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppSelector } from '../store';
import { getAllTables } from '../services/tables.service';
import { getWeddingInfo } from '../services/info.service';
import { WeddingTableWithGuests } from '../types/domain';
import FloorPlanCanvas from '../components/FloorPlanCanvas';
import { getEffectivePartySize } from '../utils/effectiveAttendance';

const STAGE_LABEL_STORAGE_KEY = 'wedding.floorPlan.stageLabel';
const ENTRANCE_POSITION_STORAGE_KEY = 'wedding.floorPlan.entrancePosition';

export default function SeatingTab() {
  const guest = useAppSelector((s) => s.auth.guest);

  const [tables,        setTables]        = useState<WeddingTableWithGuests[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [dialogTable,   setDialogTable]   = useState<WeddingTableWithGuests | null>(null);
  const [stageLabel,    setStageLabel]    = useState('חופה');
  const [entrancePosition, setEntrancePosition] = useState<'right' | 'bottom' | 'left'>('bottom');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedEntrance = window.localStorage.getItem(ENTRANCE_POSITION_STORAGE_KEY);
      if (storedEntrance === 'right' || storedEntrance === 'left' || storedEntrance === 'bottom') {
        setEntrancePosition(storedEntrance);
      }
    }

    const fetchData = async () => {
      try {
        const [tables, info] = await Promise.all([getAllTables(), getWeddingInfo()]);
        setTables(tables);
        if (info.stage_label?.trim()) {
          setStageLabel(info.stage_label);
        } else if (typeof window !== 'undefined') {
          const stored = window.localStorage.getItem(STAGE_LABEL_STORAGE_KEY);
          if (stored?.trim()) setStageLabel(stored);
        }
      } catch {
        setError('לא ניתן לטעון את מפת הסידור');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // const ownTable = tables.find(t => t.table_number === guest?.table_number) ?? null;

  function handleSelectTable(id: string) {
    const t = tables.find(t => t.id === id);
    if (t) setDialogTable(t);
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* ── Header ─────────────────────────────────────── */}
        <Box sx={{
          display: 'flex', flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { sm: 'center' }, justifyContent: 'space-between',
          mb: 2.5, gap: 1.5,
        }}>
          <Box>
            <Typography variant="h6" sx={{
              fontFamily: "'Frank Ruhl Libre', serif",
              fontWeight: 700, color: '#2C1810',
            }}>
              מפת הושבה
            </Typography>
            <Typography variant="body2" sx={{ color: '#A08070', mt: 0.25 }}>
              לחץ על שולחן כדי לראות את יושביו
            </Typography>
          </Box>

          {/* Own table badge */}
          {guest?.table_number ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: '#A08070', whiteSpace: 'nowrap' }}>
                השולחן שלך:
              </Typography>
              <Chip
                icon={<StarIcon sx={{ fontSize: 14, color: '#FAF7F2 !important' }} />}
                label={`שולחן ${guest.table_number}`}
                sx={{
                  background:    'linear-gradient(135deg, #E0C97A, #C9A84C)',
                  color:         '#FAF7F2',
                  fontWeight:    700,
                  px:            0.5,
                  height:        34,
                  boxShadow:     '0 3px 12px rgba(201,168,76,0.35)',
                  '& .MuiChip-icon': { ml: 0.5 },
                }}
              />
            </Box>
          ) : (
            <Chip
              label="לא שובצת לשולחן עדיין"
              variant="outlined"
              sx={{ borderColor: 'rgba(201,168,76,0.4)', color: '#A08070', fontStyle: 'italic' }}
            />
          )}
        </Box>

        {/* ── Loading / Error ─────────────────────────────── */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress sx={{ color: '#C9A84C' }} size={36} />
          </Box>
        )}

        {!loading && error && (
          <Alert severity="error" sx={{ borderRadius: 2, mb: 2 }}>{error}</Alert>
        )}

        {/* ── Floor plan ─────────────────────────────────── */}
        {!loading && !error && (
          <AnimatePresence mode="wait">
            <motion.div
              key="floorplan"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            >
              <FloorPlanCanvas
                tables={tables}
                stageLabel={stageLabel}
                entrancePosition={entrancePosition}
                ownTableNumber={guest?.table_number ?? null}
                editable={false}
                onSelectTable={handleSelectTable}
              />
            </motion.div>
          </AnimatePresence>
        )}

        {/* ── Legend ─────────────────────────────────────── */}
        {!loading && !error && (
          <Box sx={{
            display: 'flex', gap: 2.5, mt: 1.5, flexWrap: 'wrap',
            justifyContent: { xs: 'center', sm: 'flex-start' },
          }}>
            {[
              { color: 'linear-gradient(135deg, #E0C97A, #C9A84C)', label: 'השולחן שלך' },
              { color: 'rgba(255,255,253,0.93)', border: '1.5px solid rgba(201,168,76,0.55)', label: 'שולחן אחר' },
            ].map(item => (
              <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Box sx={{
                  width:        14, height: 14,
                  borderRadius: '50%',
                  background:   item.color,
                  border:       item.border,
                  flexShrink:   0,
                }} />
                <Typography variant="caption" sx={{ color: '#A08070' }}>
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </motion.div>

      {/* ── Table Detail Dialog ─────────────────────────────── */}
      <Dialog
        open={dialogTable !== null}
        onClose={() => setDialogTable(null)}
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
        {dialogTable && (
          <>
            <DialogTitle sx={{
              fontFamily: "'Frank Ruhl Libre', serif",
              fontWeight: 700,
              color: '#2C1810',
              pb: 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: dialogTable.table_number === guest?.table_number
                    ? 'linear-gradient(135deg, #E0C97A, #C9A84C)'
                    : 'rgba(201,168,76,0.15)',
                  border: '1.5px solid rgba(201,168,76,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: dialogTable.table_number === guest?.table_number ? '#FAF7F2' : '#9A7833' }}>
                    {dialogTable.table_number}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 700, color: '#2C1810', lineHeight: 1.2 }}>
                    שולחן {dialogTable.table_number}
                    {dialogTable.table_number === guest?.table_number && (
                      <Typography component="span" sx={{ mr: 1, fontSize: '0.7rem', color: '#C9A84C' }}>
                        {' '}★ השולחן שלך
                      </Typography>
                    )}
                  </Typography>
                  {dialogTable.label && (
                    <Typography variant="caption" sx={{ color: '#A08070' }}>
                      {dialogTable.label}
                    </Typography>
                  )}
                </Box>
              </Box>
              <IconButton size="small" onClick={() => setDialogTable(null)} sx={{ color: '#A08070' }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>

            <Divider sx={{ mx: 2, borderColor: 'rgba(201,168,76,0.2)' }} />

            <DialogContent sx={{ pt: 1 }}>
              {/* Seat count */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" sx={{ color: '#A08070' }}>
                  מוזמנים בשולחן
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#2C1810' }}>
                  {dialogTable.guests.reduce((sum, g) => sum + getEffectivePartySize(g), 0)} / {dialogTable.capacity}
                </Typography>
              </Box>

              {dialogTable.guests.length === 0 ? (
                <Typography variant="body2" sx={{
                  textAlign: 'center', color: '#B0A090', fontStyle: 'italic', py: 2,
                }}>
                  אין מוזמנים בשולחן זה עדיין
                </Typography>
              ) : (
                <List dense disablePadding>
                  {dialogTable.guests.map((g) => {
                    const isMe = g.id === guest?.id;
                    return (
                      <ListItem
                        key={g.id}
                        disablePadding
                        sx={{
                          py: 0.4,
                          px: 1,
                          borderRadius: 1.5,
                          background: isMe ? 'rgba(201,168,76,0.1)' : 'transparent',
                          border: isMe ? '1px solid rgba(201,168,76,0.25)' : '1px solid transparent',
                          mb: 0.4,
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          {isMe
                            ? <StarIcon sx={{ fontSize: 16, color: '#C9A84C' }} />
                            : <PersonIcon sx={{ fontSize: 14, color: 'rgba(154,120,51,0.5)' }} />
                          }
                        </ListItemIcon>
                        <ListItemText
                          primary={g.full_name}
                          secondary={isMe ? 'את / אתה' : undefined}
                          primaryTypographyProps={{
                            fontSize: '0.88rem',
                            fontWeight: isMe ? 700 : 400,
                            color: isMe ? '#2C1810' : '#4A3C30',
                          }}
                          secondaryTypographyProps={{
                            fontSize: '0.7rem', color: '#C9A84C',
                          }}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}
