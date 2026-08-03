import { useState, useEffect, type ReactElement } from 'react';
import {
  Box, Tab, Tabs, Typography, IconButton, Tooltip, Fade,
} from '@mui/material';
import EditCalendarOutlinedIcon from '@mui/icons-material/EditCalendarOutlined';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import TableBarIcon from '@mui/icons-material/TableBar';
import Groups2Icon from '@mui/icons-material/Groups2';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import LogoutIcon from '@mui/icons-material/LogoutOutlined';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../store';
import { logout } from '../store/authSlice';
import { WeddingInfo } from '../types/domain';
import WeddingInfoEditor from './couple/WeddingInfoEditor';
import MessageEditor from './couple/MessageEditor';
import SeatingEditor from './couple/SeatingEditor';
import GuestListEditor from './couple/GuestListEditor';
import PhotosTab from './PhotosTab';
import TaskManagementPage from './couple/TaskManagementPage';
import WeddingRequestsAdminPage from './couple/WeddingRequestsAdminPage';
import { useWeddingInfo } from '../hooks/useWeddingInfo';

function getFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || '';
}

// ─── Tab config ──────────────────────────────────────────────

const BASE_TABS = [
  { label: 'פרטי האירוע', icon: <EditCalendarOutlinedIcon sx={{ fontSize: 22 }} /> },
  { label: 'הודעה לאורחים', icon: <FavoriteBorderIcon sx={{ fontSize: 22 }} /> },
  { label: 'מעקב משימות', icon: <AssignmentOutlinedIcon sx={{ fontSize: 22 }} /> },
  { label: 'אורחים והזמנות', icon: <Groups2Icon sx={{ fontSize: 22 }} /> },
  { label: 'הושבה', icon: <TableBarIcon sx={{ fontSize: 22 }} /> },
  { label: 'גלריה', icon: <PhotoLibraryOutlinedIcon sx={{ fontSize: 22 }} /> },
] as const;

const BASE_PANELS = [
  <WeddingInfoEditor />,
  <MessageEditor />,
  <TaskManagementPage />,
  <GuestListEditor />,
  <SeatingEditor />,
  <PhotosTab />,
];

// ─── Panel animation ─────────────────────────────────────────

const panelVariants = {
  enter: { opacity: 0, y: 18 },
  center: { opacity: 1, y: 0, transition: { duration: 0.42, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.22, ease: 'easeIn' as const } },
};

// ─── Botanical SVG ornament ───────────────────────────────────

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

// ─── Ornamental header ────────────────────────────────────────

function OrnamentalHeader({
  info, guest, activeTab, onTabChange, onLogout, tabs,
}: {
  info: WeddingInfo | null;
  guest: { full_name: string; side: string | null } | null;
  activeTab: number;
  onTabChange: (v: number) => void;
  onLogout: () => void;
  tabs: Array<{ label: string; icon: ReactElement }>;
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

        {/* Badge + logout row */}
        <Box
          sx={{
            position: 'relative', zIndex: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            px: 2.5, mb: 1,
          }}
        >
          <Box sx={{
            background: 'rgba(201,168,76,0.13)',
            border: '1px solid rgba(201,168,76,0.42)',
            borderRadius: 10, px: 1.5, py: 0.35,
          }}>
            <Typography sx={{ fontSize: '0.72rem', color: '#9A7833', fontWeight: 700, letterSpacing: 0.5 }}>
              {guest?.side === 'כלה' ? '👰 כלה' : '🤵 חתן'}
            </Typography>
          </Box>

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

        {/* Names */}
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
            {info
              ? `${getFirstName(info.bride_name)} & ${getFirstName(info.groom_name)}`
              : 'החתונה שלנו 💍'}
          </Typography>
          {info?.wedding_date && (
            <Typography sx={{ fontSize: '0.82rem', color: '#A08070', mt: 0.4, fontWeight: 500, letterSpacing: 0.3 }}>
              {(() => {
                const d = new Date(info.wedding_date + 'T12:00:00');
                const weekday = d.toLocaleDateString('he-IL', { weekday: 'long' });
                const date = d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
                return `${weekday}, ${date}`;
              })()}
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
            {tabs.map((tab, i) => (
              <Tab key={i} icon={tab.icon} iconPosition="top" label={tab.label} disableRipple={false} />
            ))}
          </Tabs>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Main ────────────────────────────────────────────────────

export default function CoupleLayout() {
  const { info } = useWeddingInfo();
  const dispatch = useAppDispatch();
  const guest = useAppSelector((s) => s.auth.guest);
  const isDanHavivAdmin = guest?.role === 'couple' && guest?.full_name?.trim() === 'דן חביב';
  const tabs = isDanHavivAdmin
    ? [...BASE_TABS, { label: 'בקשות הרשמה', icon: <ManageAccountsOutlinedIcon sx={{ fontSize: 22 }} /> }]
    : BASE_TABS;
  const panels = isDanHavivAdmin
    ? [...BASE_PANELS, <WeddingRequestsAdminPage />]
    : BASE_PANELS;

  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (activeTab >= tabs.length) {
      setActiveTab(0);
    }
  }, [activeTab, tabs.length]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(ellipse at 15% 0%, rgba(224,201,122,0.10) 0%, transparent 55%),' +
          'radial-gradient(ellipse at 85% 100%, rgba(201,168,76,0.08) 0%, transparent 55%),' +
          'linear-gradient(175deg, #FAF7F2 0%, #F5EDD9 40%, #FAF7F2 100%)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <OrnamentalHeader
          info={info}
          guest={guest}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onLogout={() => dispatch(logout())}
          tabs={tabs as Array<{ label: string; icon: ReactElement }>}
        />
      </motion.div>

      <Box
        sx={{
          flex: 1, maxWidth: 680, width: '100%',
          mx: 'auto', px: { xs: 0, sm: 1 }, overflow: 'hidden',
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
            <Fade in timeout={200}>
              <Box>{panels[activeTab]}</Box>
            </Fade>
          </motion.div>
        </AnimatePresence>
      </Box>
    </Box>
  );
}
