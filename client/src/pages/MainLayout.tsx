import { useEffect, useState } from 'react';
import { Box, Tab, Tabs, Typography, IconButton, Tooltip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import TableBarIcon from '@mui/icons-material/TableBar';
import FavoriteIcon from '@mui/icons-material/Favorite';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import LogoutIcon from '@mui/icons-material/LogoutOutlined';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../store';
import { logout } from '../store/authSlice';
import InfoTab    from './InfoTab';
import PhotosTab  from './PhotosTab';
import SeatingTab from './SeatingTab';
import MessageTab from './MessageTab';
import AttendanceStatusTab from './AttendanceStatusTab';

// ─── Tab config ──────────────────────────────────────────────

const TABS = [
  { label: 'פרטי האירוע',  icon: <InfoOutlinedIcon sx={{ fontSize: 22 }} />,       component: <InfoTab /> },
  { label: 'גלריה',         icon: <PhotoLibraryOutlinedIcon sx={{ fontSize: 22 }} />, component: <PhotosTab /> },
  { label: 'הושבה',         icon: <TableBarIcon sx={{ fontSize: 22 }} />,             component: <SeatingTab /> },
  { label: 'מאיתנו אליכם',   icon: <FavoriteIcon sx={{ fontSize: 22 }} />,             component: <MessageTab /> },
  { label: 'סטטוס הגעה',    icon: <HowToRegIcon sx={{ fontSize: 22 }} />,              component: <AttendanceStatusTab /> },
] as const;

// ─── Tab panel ───────────────────────────────────────────────

const panelVariants = {
  enter: { opacity: 0, y: 18 },
  center: { opacity: 1, y: 0, transition: { duration: 0.42, ease: 'easeOut' as const } },
  exit:  { opacity: 0, y: -12, transition: { duration: 0.22, ease: 'easeIn' as const } },
};

// ─── Gold ornament ───────────────────────────────────────────

function GoldDivider() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', px: 3, py: 0.5 }}>
      <Box sx={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.2)' }} />
      <Typography sx={{ color: 'rgba(201,168,76,0.5)', mx: 1.5, fontSize: '0.7rem' }}>✦</Typography>
      <Box sx={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.2)' }} />
    </Box>
  );
}

// ─── Main ───────────────────────────────────────────────────

export default function MainLayout() {
  const dispatch = useAppDispatch();
  const guest    = useAppSelector((s) => s.auth.guest);
  const isCouple = guest?.role === 'couple';
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (!guest || guest.role !== 'guest' || guest.rsvp_status !== 'PENDING') return;

    const forceRsvpGuestId = sessionStorage.getItem('wedding.forceRsvpGuestId');
    if (forceRsvpGuestId === guest.id) {
      setActiveTab(TABS.length - 1);
      sessionStorage.removeItem('wedding.forceRsvpGuestId');
    }
  }, [guest]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(ellipse at 15% 0%, rgba(224,201,122,0.13) 0%, transparent 55%),' +
          'radial-gradient(ellipse at 85% 100%, rgba(201,168,76,0.10) 0%, transparent 55%),' +
          'linear-gradient(175deg, #FAF7F2 0%, #F5EDD9 40%, #FAF7F2 100%)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{ position: 'sticky', top: 0, zIndex: 100 }}
      >
        <Box
          sx={{
            background: 'rgba(255,255,255,0.82)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(201,168,76,0.18)',
            px: { xs: 2, sm: 3 },
            pt: 2.5,
            pb: 0,
          }}
        >
          {/* Top row: greeting + logout */}
          <Box
            sx={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', mb: 1.5,
            }}
          >
            <Box>
              <Typography
                variant="h5"
                sx={{
                  fontFamily: "'Frank Ruhl Libre', serif",
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #C9A84C, #9A7833)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  lineHeight: 1.2,
                }}
              >
                החתונה שלנו 💍
              </Typography>
              {guest && (
                <Typography variant="caption" sx={{ color: '#A08070', display: 'block', mt: 0.25 }}>
                  שלום, {guest.full_name}!&nbsp;&nbsp;
                  {guest.table_number && (
                    <Box
                      component="span"
                      sx={{
                        background: 'rgba(201,168,76,0.15)',
                        border: '1px solid rgba(201,168,76,0.3)',
                        borderRadius: 10, px: 1, py: 0.1,
                        fontSize: '0.7rem', color: '#9A7833', fontWeight: 600,
                      }}
                    >
                      שולחן {guest.table_number}
                    </Box>
                  )}
                </Typography>
              )}
            </Box>

            {isCouple && (
              <Tooltip title="יציאה">
                <IconButton
                  onClick={() => dispatch(logout())}
                  size="small"
                  sx={{
                    color: '#A08070',
                    border: '1px solid rgba(201,168,76,0.25)',
                    borderRadius: 2, p: 0.75,
                    '&:hover': { background: 'rgba(201,168,76,0.1)', color: '#9A7833' },
                  }}
                >
                  <LogoutIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              minHeight: 58,
              '& .MuiTabs-flexContainer': { gap: 0, justifyContent: { xs: 'flex-start', md: 'center' } },
              '& .MuiTab-root': {
                minHeight: 58, py: 1.1, px: { xs: 1, sm: 2 },
                fontSize: { xs: '0.75rem', sm: '0.85rem' }, gap: '4px',
                color: '#A08070',
                '&.Mui-selected': { color: '#9A7833', fontWeight: 700 },
              },
            }}
          >
            {TABS.map((tab, i) => (
              <Tab key={i} icon={tab.icon} iconPosition="top" label={tab.label} disableRipple={false} />
            ))}
          </Tabs>
        </Box>
      </motion.div>

      <GoldDivider />

      {/* ── Tab content ─────────────────────────────────────── */}
      <Box
        sx={{
          flex: 1, maxWidth: 680, width: '100%',
          mx: 'auto', px: { xs: 0, sm: 1 }, pb: 4, overflow: 'hidden',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={panelVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {activeTab === TABS.length - 1
              ? <AttendanceStatusTab onSaved={(nextStatus) => {
                if (nextStatus === 'COMING') {
                  setActiveTab(0);
                }
              }} />
              : TABS[activeTab].component}
          </motion.div>
        </AnimatePresence>
      </Box>
    </Box>
  );
}
