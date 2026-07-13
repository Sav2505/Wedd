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
import InfoTab from './InfoTab';
import PhotosTab from './PhotosTab';
import SeatingTab from './SeatingTab';
import MessageTab from './MessageTab';
import AttendanceStatusTab from './AttendanceStatusTab';

// ─── Tab config ──────────────────────────────────────────────

const TABS = [
  { label: 'פרטי האירוע', icon: <InfoOutlinedIcon sx={{ fontSize: 22 }} />, component: <InfoTab /> },
  { label: 'הושבה', icon: <TableBarIcon sx={{ fontSize: 22 }} />, component: <SeatingTab /> },
  { label: 'גלריה', icon: <PhotoLibraryOutlinedIcon sx={{ fontSize: 22 }} />, component: <PhotosTab /> },
  { label: 'מאיתנו אליכם', icon: <FavoriteIcon sx={{ fontSize: 22 }} />, component: <MessageTab /> },
  { label: 'סטטוס הגעה', icon: <HowToRegIcon sx={{ fontSize: 22 }} />, component: <AttendanceStatusTab /> },
] as const;

// ─── Tab panel ───────────────────────────────────────────────

const panelVariants = {
  enter: { opacity: 0, y: 18 },
  center: { opacity: 1, y: 0, transition: { duration: 0.42, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.22, ease: 'easeIn' as const } },
};

// ─── Botanical SVG ornament (same as CoupleLayout) ────────────

function BotanicalSVG() {
  const g = '#C9A84C';
  const gl = '#E0C97A';
  const gd = '#9A7833';

  function Rose({ x, y, r = 7, op = 0.75 }: { x: number; y: number; r?: number; op?: number }) {
    return (
      <g transform={`translate(${x},${y})`} opacity={op}>
        {[0, 72, 144, 216, 288].map((a, i) => (
          <ellipse key={i} cx={0} cy={-r * 0.85} rx={r * 0.55} ry={r}
            fill={i % 2 === 0 ? gl : g} transform={`rotate(${a})`} opacity={0.8} />
        ))}
        <circle cx={0} cy={0} r={r * 0.35} fill={gd} opacity={0.9} />
      </g>
    );
  }

  function Leaf({ x, y, angle = 0, len = 12, op = 0.65 }: { x: number; y: number; angle?: number; len?: number; op?: number }) {
    const w = len * 0.4;
    return (
      <path
        d={`M 0,0 C ${-w},${-len * 0.4} ${-w * 0.5},${-len} 0,${-len} C ${w * 0.5},${-len} ${w},${-len * 0.4} 0,0 Z`}
        fill={g} opacity={op}
        transform={`translate(${x},${y}) rotate(${angle})`}
      />
    );
  }

  function Bud({ x, y, angle = 0, op = 0.6 }: { x: number; y: number; angle?: number; op?: number }) {
    return (
      <g transform={`translate(${x},${y}) rotate(${angle})`} opacity={op}>
        <ellipse cx={0} cy={-5} rx={3} ry={5} fill={gl} />
        <ellipse cx={0} cy={-5} rx={2} ry={4} fill={g} opacity={0.7} />
        <line x1={0} y1={0} x2={0} y2={3} stroke={gd} strokeWidth={0.9} />
      </g>
    );
  }

  const LeftSpray = () => (
    <g opacity={0.88}>
      <path d="M -5,-5 C 15,25 10,55 30,80 C 42,97 38,120 45,140" stroke={g} strokeWidth={1.4} fill="none" strokeLinecap="round" opacity={0.5} />
      <path d="M 22,45 C 40,32 65,30 88,20" stroke={g} strokeWidth={1.1} fill="none" strokeLinecap="round" opacity={0.45} />
      <path d="M 34,82 C 52,70 78,72 96,62" stroke={g} strokeWidth={1.0} fill="none" strokeLinecap="round" opacity={0.42} />
      <path d="M 88,20 C 96,12 104,18 100,26" stroke={g} strokeWidth={0.9} fill="none" strokeLinecap="round" opacity={0.38} />

      <Leaf x={12} y={22} angle={-50} len={13} op={0.62} />
      <Leaf x={18} y={22} angle={30} len={11} op={0.52} />
      <Leaf x={24} y={52} angle={-45} len={14} op={0.60} />
      <Leaf x={30} y={52} angle={35} len={11} op={0.50} />
      <Leaf x={36} y={86} angle={-40} len={13} op={0.58} />
      <Leaf x={40} y={86} angle={30} len={10} op={0.48} />
      <Leaf x={38} y={118} angle={-35} len={12} op={0.52} />
      <Leaf x={50} y={34} angle={-20} len={11} op={0.58} />
      <Leaf x={68} y={28} angle={-10} len={10} op={0.52} />
      <Leaf x={58} y={70} angle={-18} len={11} op={0.55} />
      <Leaf x={76} y={66} angle={-8} len={10} op={0.50} />

      <Rose x={90} y={16} r={9} op={0.82} />
      <Rose x={98} y={60} r={7} op={0.74} />
      <Rose x={44} y={138} r={6} op={0.66} />

      <Bud x={16} y={5} angle={-15} op={0.58} />
      <Bud x={62} y={22} angle={10} op={0.54} />
      <Bud x={90} y={62} angle={-5} op={0.54} />
      <Bud x={102} y={24} angle={20} op={0.50} />
    </g>
  );

  return (
    <svg
      viewBox="0 0 420 220"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      aria-hidden="true"
    >
      {/* Left corner */}
      <LeftSpray />

      {/* Right corner — mirror */}
      <g transform="scale(-1,1) translate(-420,0)">
        <LeftSpray />
      </g>

      {/* Top center star ornament */}
      <g transform="translate(210,14)" opacity={0.55}>
        <path d="M -48,0 C -32,-1 -16,0 0,0 C 16,0 32,-1 48,0" stroke={g} strokeWidth={0.8} fill="none" />
        <path d="M -5,-5 L 0,-10 L 5,-5 L 10,0 L 5,5 L 0,10 L -5,5 L -10,0 Z" fill={g} opacity={0.75} />
        <circle cx={0} cy={0} r={2.5} fill={gd} opacity={0.85} />
      </g>

      {/* Divider between names and tabs */}
      <g transform="translate(210,158)" opacity={0.48}>
        <line x1={-92} y1={0} x2={-18} y2={0} stroke={g} strokeWidth={0.7} />
        <line x1={18} y1={0} x2={92} y2={0} stroke={g} strokeWidth={0.7} />
        <path d="M -5,-5 L 0,-9 L 5,-5 L 9,0 L 5,5 L 0,9 L -5,5 L -9,0 Z" fill={g} opacity={0.8} />
        <circle cx={0} cy={0} r={1.8} fill={gd} />
        <path d="M -2,-2 L 0,-4 L 2,-2 L 4,0 L 2,2 L 0,4 L -2,2 L -4,0 Z" fill={g} transform="translate(-14,0)" opacity={0.6} />
        <path d="M -2,-2 L 0,-4 L 2,-2 L 4,0 L 2,2 L 0,4 L -2,2 L -4,0 Z" fill={g} transform="translate(14,0)" opacity={0.6} />
      </g>
    </svg>
  );
}

// ─── Ornamental header (adapted for guest layout) ─────────────

function OrnamentalHeader({
  guest, activeTab, onTabChange, onLogout,
}: {
  guest: { full_name: string; table_number?: number | null } | null;
  activeTab: number;
  onTabChange: (v: number) => void;
  onLogout: () => void;
}) {
  return (
    <Box sx={{ position: 'sticky', top: 0, zIndex: 100 }}>
      <Box
        sx={{
          position: 'relative',
          background: 'linear-gradient(160deg, #FEFCF5 0%, #F9F0DC 40%, #FBF5E6 70%, #FAF7F2 100%)',
          borderRadius: '0 0 40px 40px',
          overflow: 'hidden',
          boxShadow: '0 6px 32px rgba(154,120,51,0.16), 0 2px 8px rgba(201,168,76,0.10)',
          borderBottom: '1.5px solid rgba(201,168,76,0.32)',
          pt: 1,
          pb: 0,
        }}
      >
        <BotanicalSVG />

        {/* Logout row */}
        <Box
          sx={{
            position: 'relative', zIndex: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            px: 2.5, mb: 1,
          }}
        >
          <Tooltip title="התנתקות">
            <IconButton
              onClick={onLogout} size="small"
              sx={{
                color: '#A08070',
                border: '1px solid rgba(201,168,76,0.28)',
                borderRadius: 2, p: 0.75,
                '&:hover': { background: 'rgba(201,168,76,0.12)', color: '#9A7833' },
              }}
            >
              <LogoutIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Title + greeting */}
        <Box sx={{ position: 'relative', zIndex: 2, textAlign: 'center', px: 2, mb: 0.5 }}>
          <Typography
            sx={{
              fontFamily: "'Frank Ruhl Libre', serif",
              fontSize: '1.9rem', fontWeight: 700,
              background: 'linear-gradient(135deg, #B8922A 0%, #E0C97A 45%, #9A7833 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1.2,
            }}
          >
            החתונה שלנו 💍
          </Typography>
          {guest && (
            <Typography sx={{ fontSize: '0.82rem', color: '#A08070', mt: 0.4, fontWeight: 500, letterSpacing: 0.3 }}>
              שלום, {guest.full_name}!
              {guest.table_number && (
                <Box
                  component="span"
                  sx={{
                    ml: 1,
                    background: 'rgba(201,168,76,0.15)',
                    border: '1px solid rgba(201,168,76,0.3)',
                    borderRadius: 10, px: 1, py: 0.1,
                    fontSize: '0.7rem', color: '#9A7833', fontWeight: 600,
                    display: 'inline-block',
                  }}
                >
                  שולחן {guest.table_number}
                </Box>
              )}
            </Typography>
          )}
        </Box>

        {/* Tabs */}
        <Box sx={{ position: 'relative', zIndex: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => onTabChange(v)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            TabIndicatorProps={{ style: { background: 'linear-gradient(90deg,#C9A84C,#E0C97A)', height: 3, borderRadius: 2 } }}
            sx={{
              minHeight: 62,
              '& .MuiTabs-flexContainer': { gap: 0, justifyContent: { xs: 'flex-start', md: 'center' } },
              '& .MuiTabs-scrollButtons': {
                color: '#C9A84C',
                '&.Mui-disabled': { opacity: 0.2 },
              },
              '& .MuiTab-root': {
                minHeight: 62, py: 1.2, px: { xs: 1.5, sm: 2 },
                minWidth: { xs: 90, sm: 110 },
                fontSize: { xs: '0.75rem', sm: '0.88rem' }, gap: '4px',
                color: '#B0957A',
                '&.Mui-selected': { color: '#9A7833', fontWeight: 700 },
              },
            }}
          >
            {TABS.map((tab, i) => (
              <Tab key={i} icon={tab.icon} iconPosition="top" label={tab.label} disableRipple={false} />
            ))}
          </Tabs>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Main ───────────────────────────────────────────────────

export default function MainLayout() {
  const dispatch = useAppDispatch();
  const guest = useAppSelector((s) => s.auth.guest);
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
      >
        <OrnamentalHeader
          guest={guest}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onLogout={() => dispatch(logout())}
        />
      </motion.div>

      {/* ── Tab content ─────────────────────────────────────── */}
      <Box
        sx={{
          flex: 1, maxWidth: 680, width: '100%',
          mx: 'auto', px: { xs: 0, sm: 1 }, pt: 2, pb: 4, overflow: 'hidden',
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