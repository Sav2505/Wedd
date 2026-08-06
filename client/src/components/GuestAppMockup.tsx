import { Box, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import TableBarIcon from '@mui/icons-material/TableBar';
import FavoriteIcon from '@mui/icons-material/Favorite';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import InfoTab from '../pages/InfoTab';
import { WeddingInfo } from '../types/domain';

const DEMO_WEDDING: WeddingInfo = {
    id: 9001,
    bride_name: 'שחר',
    groom_name: 'דן',
    wedding_date: '2026-12-07',
    wedding_time: '19:30',
    wedding_canpoy_time: '20:30',
    venue_name: 'הגן הכחול',
    venue_address: 'רחוב הירקון 20, תל אביב',
    venue_lat: 32.0853,
    venue_lng: 34.7818,
    dress_code: 'אלגנט',
    notes: 'חניה במקום | מומלץ להגיע 15 דקות לפני קבלת הפנים',
    message: null,
    hero_image_url: null,
    stage_label: 'סטייג׳ מרכזי',
    is_tables_published: true,
    whatsapp_owner_confirmed: false,
    table_scale_factor: 1,
    bride_bit_url: 'www.example.com',
    groom_bit_url: 'www.example.com',
    updated_at: '2026-11-01T12:00:00Z',
};

const TABS = [
    { label: 'פרטי האירוע', icon: <InfoOutlinedIcon sx={{ fontSize: 17 }} />, active: true },
    { label: 'הושבה', icon: <TableBarIcon sx={{ fontSize: 17 }} />, active: false },
    { label: 'גלריה', icon: <PhotoLibraryOutlinedIcon sx={{ fontSize: 17 }} />, active: false },
    { label: 'מאיתנו', icon: <FavoriteIcon sx={{ fontSize: 17 }} />, active: false },
    { label: 'אישור הגעה', icon: <HowToRegIcon sx={{ fontSize: 17 }} />, active: false },
];

// ─── Botanical SVG ornament — copied 1:1 from MainLayout's
// OrnamentalHeader, so the mockup carries the exact same
// floral corner sprays, top star, and mid-divider ornament. ──

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

export default function GuestAppMockup() {
    return (
        <Box
            sx={{
                mx: 'auto',
                maxWidth: 360,
                borderRadius: '26px',
                overflow: 'hidden',
                background:
                    'radial-gradient(ellipse at 15% 0%, rgba(224,201,122,0.13) 0%, transparent 55%),' +
                    'radial-gradient(ellipse at 85% 100%, rgba(201,168,76,0.10) 0%, transparent 55%),' +
                    'linear-gradient(175deg, #FAF7F2 0%, #F5EDD9 40%, #FAF7F2 100%)',
                border: '1px solid rgba(201,168,76,0.22)',
                boxShadow: '0 4px 20px rgba(44,24,16,0.08), 0 26px 60px rgba(44,24,16,0.16)',
            }}
        >
            <span style={{ fontSize: "14px", marginRight: "12px", color: "rgba(0, 0, 0, 0.5)" }}>סקיצה קטנה</span>
            <Box
                sx={{
                    position: 'relative',
                    overflow: 'hidden',
                    background: 'linear-gradient(160deg, #FEFCF5 0%, #F9F0DC 40%, #FBF5E6 70%, #FAF7F2 100%)',
                    borderRadius: '0 0 26px 26px',
                    borderBottom: '1.5px solid rgba(201,168,76,0.28)',
                    boxShadow: '0 4px 18px rgba(154,120,51,0.10)',
                    pt: 1.5,
                    pb: 0.5,
                    px: 2,
                }}
            >
                <BotanicalSVG />
                {/* Floral corner sprays + top star + mid divider, same SVG as the live app */}

                <Typography
                    align="center"
                    sx={{
                        position: 'relative',
                        zIndex: 2,
                        fontFamily: "'Frank Ruhl Libre', serif",
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #B8922A 0%, #E0C97A 45%, #9A7833 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        lineHeight: 1.5,
                        mt: 0.5,
                    }}
                >
                    שחר &amp; דן 💍
                </Typography>

                <Typography
                    align="center"
                    sx={{ position: 'relative', zIndex: 2, fontSize: '0.68rem', color: '#A08070', mt: 0.3, mb: 1.8, fontWeight: 500 }}
                >
                    שלום, שיר כהן !
                    <Box
                        component="span"
                        sx={{
                            ml: 0.5,
                            background: 'rgba(201,168,76,0.15)',
                            border: '1px solid rgba(201,168,76,0.3)',
                            borderRadius: 10,
                            px: 0.7,
                            py: 0.1,
                            fontSize: '0.62rem',
                            color: '#9A7833',
                            fontWeight: 600,
                            display: 'inline-block',
                        }}
                    >
                        שולחן 12
                    </Box>
                </Typography>

                {/* Tabs row */}
                <Box sx={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', px: 0.5 }}>
                    {TABS.map((tab) => (
                        <Box
                            key={tab.label}
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 0.4,
                                pb: 0.5,
                                flex: 1,
                                color: tab.active ? '#9A7833' : '#B0957A',
                                borderBottom: tab.active ? '2.5px solid transparent' : 'none',
                                borderImage: tab.active ? 'linear-gradient(90deg,#C9A84C,#E0C97A) 1' : 'none',
                            }}
                        >
                            {tab.icon}
                            <Typography sx={{ fontSize: '0.56rem', fontWeight: tab.active ? 700 : 500 }}>
                                {tab.label}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            </Box>

            {/* ── Real InfoTab content with internal scroll ── */}
            <Box
                sx={{
                    maxHeight: 420,
                    overflowY: 'auto',
                    px: { xs: 1, sm: 1.4 },
                    py: { xs: 1, sm: 1.3 },
                    '&::-webkit-scrollbar': { width: 4 },
                    '&::-webkit-scrollbar-thumb': {
                        background: 'rgba(201,168,76,0.35)',
                        borderRadius: 4,
                    },
                }}
            >
                <InfoTab demoInfo={DEMO_WEDDING} hideRegisterCta />
            </Box>
        </Box>
    );
}