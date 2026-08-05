import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Box,
    Button,
    Chip,
    Dialog,
    DialogContent,
    IconButton,
    LinearProgress,
    Stack,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import TableBarIcon from '@mui/icons-material/TableBar';
import FavoriteIcon from '@mui/icons-material/Favorite';
import PlayCircleFilledRoundedIcon from '@mui/icons-material/PlayCircleFilledRounded';
import CelebrationIcon from '@mui/icons-material/Celebration';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EastIcon from '@mui/icons-material/East';
import { AnimatePresence, motion } from 'framer-motion';
import GoldCard from './GoldCard';
import WhatsAppMessagePreview from './WhatsAppMessagePreview';
import InfoTab from '../pages/InfoTab';
import { Guest, RsvpStatus, WeddingInfo } from '../types/domain';
import { palette } from '../shared/animations';

type Props = {
    open: boolean;
    onClose: () => void;
};

type Step = 'intro' | 'whatsapp' | 'rsvp' | 'success' | 'details';

const STEP_ORDER: Step[] = ['intro', 'whatsapp', 'rsvp', 'success', 'details'];

const STEP_COPY: Record<Step, { title: string; subtitle: string }> = {
    intro: {
        title: 'כך האורחים שלכם יחוו את WedFlow',
        subtitle: 'סיור מודרך קצר, אינטראקטיבי וברור - בדיוק כמו האורח שלכם.',
    },
    whatsapp: {
        title: 'שקופית 2/5 - הודעת WhatsApp ראשונית',
        subtitle: 'האורח מקבל הודעה 30 יום לפני האירוע. אפשר לערוך את התזמון בכל רגע.',
    },
    rsvp: {
        title: 'שקופית 3/5 - טאב אישור הגעה',
        subtitle: 'האורח לוחץ על אישור הגעה ומעדכן בקלות כמה מגיעים.',
    },
    success: {
        title: 'שקופית 4/5 - הודעת הצלחה חגיגית',
        subtitle: 'אחרי האישור, האורח רואה פידבק מיידי ומתקדם אוטומטית למסך הפרטים.',
    },
    details: {
        title: 'שקופית 5/5 - פרטי החתונה',
        subtitle: 'כאן האורח רואה את כל המידע: תאריך, שעות, מיקום וניווט.',
    },
};

const INVITATION_BODY = `בשמחה ובהתרגשות גדולה,
אנו מזמינים אותך לקחת חלק ביום המאושר בחיינו! 💍✨

📅 מועד האירוע: יום שני, 07 בדצמבר 2026
🥂 קבלת פנים: 19:30
⛪ חופה: 20:30

נשמח מאוד אם תאשר/י את הגעתך באמצעות הכפתור למטה, כדי שנוכל להיערך בצורה הטובה ביותר. 🙏

מחכים להתרגש, לשמוח ולחגוג איתך 🥂❤️

באהבה,
שחר & דן 💕`;

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
    table_scale_factor: 1,
};

const DEMO_GUEST: Guest = {
    id: 'demo-guest-1',
    full_name: 'יואב לוי',
    table_number: 12,
    side: 'שניהם',
    role: 'guest',
    rsvp_status: 'PENDING',
    number_of_guests: 1,
    rsvp_updated_at: null,
    wedding_id: 9001,
};

type GuestTabKey = 'info' | 'seating' | 'photos' | 'message' | 'rsvp';

type GuestExperiencePhoneProps = {
    activeTab: GuestTabKey;
    onTabClick?: (tab: GuestTabKey) => void;
    children: React.ReactNode;
};

const GUEST_TABS: Array<{ key: GuestTabKey; label: string; icon: React.ReactNode }> = [
    { key: 'info', label: 'פרטי האירוע', icon: <InfoOutlinedIcon sx={{ fontSize: 17 }} /> },
    { key: 'seating', label: 'הושבה', icon: <TableBarIcon sx={{ fontSize: 17 }} /> },
    { key: 'photos', label: 'גלריה', icon: <PhotoLibraryOutlinedIcon sx={{ fontSize: 17 }} /> },
    { key: 'message', label: 'מאיתנו', icon: <FavoriteIcon sx={{ fontSize: 17 }} /> },
    { key: 'rsvp', label: 'אישור הגעה', icon: <HowToRegIcon sx={{ fontSize: 17 }} /> },
];

function BotanicalSVG() {
    const g = '#C9A84C';
    const gl = '#E0C97A';
    const gd = '#9A7833';

    function Rose({ x, y, r = 7, op = 0.75 }: { x: number; y: number; r?: number; op?: number }) {
        return (
            <g transform={`translate(${x},${y})`} opacity={op}>
                {[0, 72, 144, 216, 288].map((a, i) => (
                    <ellipse
                        key={i}
                        cx={0}
                        cy={-r * 0.85}
                        rx={r * 0.55}
                        ry={r}
                        fill={i % 2 === 0 ? gl : g}
                        transform={`rotate(${a})`}
                        opacity={0.8}
                    />
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
                fill={g}
                opacity={op}
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

    return (
        <svg
            viewBox="0 0 420 220"
            preserveAspectRatio="xMidYMid slice"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
            aria-hidden="true"
        >
            <defs>
                <g id="guestSpray" opacity={0.88}>
                    <path d="M -5,-5 C 15,25 10,55 30,80 C 42,97 38,120 45,140" stroke={g} strokeWidth={1.4} fill="none" strokeLinecap="round" opacity={0.5} />
                    <path d="M 22,45 C 40,32 65,30 88,20" stroke={g} strokeWidth={1.1} fill="none" strokeLinecap="round" opacity={0.45} />
                    <path d="M 34,82 C 52,70 78,72 96,62" stroke={g} strokeWidth={1.0} fill="none" strokeLinecap="round" opacity={0.42} />
                    <path d="M 88,20 C 96,12 104,18 100,26" stroke={g} strokeWidth={0.9} fill="none" strokeLinecap="round" opacity={0.38} />

                    <Leaf x={12} y={22} angle={-50} len={13} op={0.62} />
                    <Leaf x={18} y={22} angle={30} len={11} op={0.52} />
                    <Leaf x={24} y={52} angle={-45} len={14} op={0.6} />
                    <Leaf x={30} y={52} angle={35} len={11} op={0.5} />
                    <Leaf x={36} y={86} angle={-40} len={13} op={0.58} />
                    <Leaf x={40} y={86} angle={30} len={10} op={0.48} />
                    <Leaf x={38} y={118} angle={-35} len={12} op={0.52} />
                    <Leaf x={50} y={34} angle={-20} len={11} op={0.58} />
                    <Leaf x={68} y={28} angle={-10} len={10} op={0.52} />
                    <Leaf x={58} y={70} angle={-18} len={11} op={0.55} />
                    <Leaf x={76} y={66} angle={-8} len={10} op={0.5} />

                    <Rose x={90} y={16} r={9} op={0.82} />
                    <Rose x={98} y={60} r={7} op={0.74} />
                    <Rose x={44} y={138} r={6} op={0.66} />

                    <Bud x={16} y={5} angle={-15} op={0.58} />
                    <Bud x={62} y={22} angle={10} op={0.54} />
                    <Bud x={90} y={62} angle={-5} op={0.54} />
                    <Bud x={102} y={24} angle={20} op={0.5} />
                </g>
            </defs>

            <use href="#guestSpray" />
            <g transform="scale(-1,1) translate(-420,0)">
                <use href="#guestSpray" />
            </g>

            <g transform="translate(210,14)" opacity={0.55}>
                <path d="M -48,0 C -32,-1 -16,0 0,0 C 16,0 32,-1 48,0" stroke={g} strokeWidth={0.8} fill="none" />
                <path d="M -5,-5 L 0,-10 L 5,-5 L 10,0 L 5,5 L 0,10 L -5,5 L -10,0 Z" fill={g} opacity={0.75} />
                <circle cx={0} cy={0} r={2.5} fill={gd} opacity={0.85} />
            </g>

            <g transform="translate(210,158)" opacity={0.48}>
                <line x1={-92} y1={0} x2={-18} y2={0} stroke={g} strokeWidth={0.7} />
                <line x1={18} y1={0} x2={92} y2={0} stroke={g} strokeWidth={0.7} />
                <path d="M -5,-5 L 0,-9 L 5,-5 L 9,0 L 5,5 L 0,9 L -5,5 L -9,0 Z" fill={g} opacity={0.8} />
                <circle cx={0} cy={0} r={1.8} fill={gd} />
            </g>
        </svg>
    );
}

function GuestExperiencePhone({ activeTab, onTabClick, children }: GuestExperiencePhoneProps) {
    return (
        <Box
            sx={{
                width: '100%',
                maxWidth: 1080,
                mx: 'auto',
                borderRadius: '28px',
                overflow: 'hidden',
                background:
                    'radial-gradient(ellipse at 15% 0%, rgba(224,201,122,0.13) 0%, transparent 55%),' +
                    'radial-gradient(ellipse at 85% 100%, rgba(201,168,76,0.1) 0%, transparent 55%),' +
                    'linear-gradient(175deg, #FAF7F2 0%, #F5EDD9 40%, #FAF7F2 100%)',
                border: '1px solid rgba(201,168,76,0.22)',
                boxShadow: '0 10px 34px rgba(44,24,16,0.14), 0 26px 60px rgba(44,24,16,0.18)',
            }}
        >
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

                <Typography
                    align="center"
                    sx={{
                        position: 'relative',
                        zIndex: 2,
                        fontFamily: "'Frank Ruhl Libre', serif",
                        fontSize: '1.28rem',
                        fontWeight: 700,
                        background: 'linear-gradient(135deg, #B8922A 0%, #E0C97A 45%, #9A7833 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        lineHeight: 1.5,
                        mt: 0.5,
                    }}
                >
                    {DEMO_WEDDING.bride_name} &amp; {DEMO_WEDDING.groom_name} 💍
                </Typography>

                <Typography
                    align="center"
                    sx={{ position: 'relative', zIndex: 2, fontSize: '0.7rem', color: '#A08070', mt: 0.3, mb: 1.8, fontWeight: 500 }}
                >
                    שלום, {DEMO_GUEST.full_name} !
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
                        שולחן {DEMO_GUEST.table_number}
                    </Box>
                </Typography>

                <Box sx={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', px: 0.5 }}>
                    {GUEST_TABS.map((tab) => {
                        const selected = tab.key === activeTab;
                        return (
                            <Box
                                key={tab.key}
                                onClick={() => onTabClick?.(tab.key)}
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 0.35,
                                    pb: 0.55,
                                    flex: 1,
                                    color: selected ? '#9A7833' : '#B0957A',
                                    borderBottom: selected ? '2.5px solid transparent' : 'none',
                                    borderImage: selected ? 'linear-gradient(90deg,#C9A84C,#E0C97A) 1' : 'none',
                                    cursor: onTabClick ? 'pointer' : 'default',
                                    transition: 'all 0.18s ease',
                                    '&:hover': onTabClick
                                        ? {
                                            color: '#9A7833',
                                            background: 'rgba(201,168,76,0.06)',
                                            borderRadius: 1,
                                        }
                                        : undefined,
                                }}
                            >
                                {tab.icon}
                                <Typography sx={{ fontSize: '0.56rem', fontWeight: selected ? 700 : 500 }}>
                                    {tab.label}
                                </Typography>
                            </Box>
                        );
                    })}
                </Box>
            </Box>

            <Box sx={{ px: { xs: 1, md: 1.4 }, py: { xs: 1, md: 1.3 } }}>
                {children}
            </Box>
        </Box>
    );
}

export default function GuestJourneyShowcaseModal({ open, onClose }: Props) {
    const [step, setStep] = useState<Step>('intro');
    const [status, setStatus] = useState<RsvpStatus>('COMING');
    const [count, setCount] = useState(1);
    const [guest, setGuest] = useState<Guest>(DEMO_GUEST);
    const [saving, setSaving] = useState(false);
    const [featureHint, setFeatureHint] = useState<{ title: string; body: string } | null>(null);
    const timersRef = useRef<number[]>([]);

    const stepIndex = useMemo(() => STEP_ORDER.indexOf(step) + 1, [step]);
    const progress = useMemo(() => (stepIndex / STEP_ORDER.length) * 100, [stepIndex]);

    useEffect(() => {
        return () => {
            timersRef.current.forEach((id) => window.clearTimeout(id));
            timersRef.current = [];
        };
    }, []);

    useEffect(() => {
        if (step !== 'success') return;
        const t = window.setTimeout(() => {
            setStep('details');
        }, 1900);
        timersRef.current.push(t);
    }, [step]);

    function goNext() {
        const idx = STEP_ORDER.indexOf(step);
        const next = STEP_ORDER[idx + 1];
        if (next) setStep(next);
    }

    function goBack() {
        const idx = STEP_ORDER.indexOf(step);
        const prev = STEP_ORDER[idx - 1];
        if (prev) setStep(prev);
    }

    function handleApproveRsvp() {
        if (status !== 'COMING') return;

        setSaving(true);
        const t = window.setTimeout(() => {
            setGuest((prev) => ({
                ...prev,
                rsvp_status: 'COMING',
                number_of_guests: count,
                rsvp_updated_at: new Date().toISOString(),
            }));
            setSaving(false);
            setStep('success');
        }, 900);
        timersRef.current.push(t);
    }

    function handleGuestTabClick(tab: GuestTabKey) {
        if (tab === 'rsvp') {
            setStep('rsvp');
            return;
        }

        if (tab === 'info') {
            setStep('details');
            return;
        }

        if (tab === 'seating') {
            setFeatureHint({
                title: 'טאב הושבה',
                body: 'בחלק הזה מוצגת סקיצת ההושבה.\nהאורח רואה את השולחן שלו מודגש עם מספר השולחן, ובלחיצה עליו יכול לראות מי יושב איתו באותו שולחן :)\n\nכחתן וכלה תוכלו גם להסתיר את האפשרות הזו מהאורחים, לבחירתכם.',
            });
            return;
        }

        if (tab === 'photos') {
            setFeatureHint({
                title: 'טאב גלריה משותפת',
                body: 'כאן יש גלריית תמונות משותפת לכל אורחי החתונה.\nהמטרה היא שכל אחד יעלה לכאן את כל הרגעים שהוא תפס מהאירוע,\nוכך כולם נהנים מאלבום חי, מרגש ומלא זוויות של כל האורחים.',
            });
            return;
        }

        setFeatureHint({
            title: 'טאב מאיתנו',
            body: 'כאן מופיעה הקדשה אישית מהחתן והכלה לכלל האורחים שלכם.\nזה המקום שלכם לכתוב מסר מרגש, תודה מיוחדת או מילים מהלב,\nואתם יכולים לערוך את ההקדשה בכל עת.',
        });
    }

    const copy = STEP_COPY[step];
    const ctaButtonSx = {
        borderRadius: 999,
        px: 3.1,
        py: 1.05,
        color: '#FFFDF8',
        fontWeight: 800,
        letterSpacing: '0.01em',
        background: 'linear-gradient(135deg, #D8B65A, #B7892D)',
        boxShadow: '0 12px 30px rgba(154,120,51,0.34)',
        border: '1px solid rgba(255,255,255,0.18)',
        transition: 'transform 0.22s ease, box-shadow 0.22s ease, filter 0.22s ease',
        '&:hover': {
            background: 'linear-gradient(135deg, #E2C46E, #C19339)',
            boxShadow: '0 16px 36px rgba(154,120,51,0.42)',
            transform: 'translateY(-2px) scale(1.01)',
            filter: 'saturate(1.05)',
        },
        '&:active': { transform: 'translateY(0)' },
    } as const;

    const ghostButtonSx = {
        borderRadius: 999,
        px: 2.5,
        py: 0.85,
        color: '#7A5E2B',
        fontWeight: 700,
        border: '1px solid rgba(201,168,76,0.42)',
        background: 'rgba(255,255,255,0.72)',
        '&:hover': {
            borderColor: 'rgba(201,168,76,0.66)',
            background: 'rgba(255,255,255,0.9)',
        },
    } as const;

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth={false}
            fullWidth
            PaperProps={{
                sx: {
                    width: 'calc(100vw - 10px)',
                    maxWidth: 'none',
                    height: 'calc(100dvh - 10px)',
                    maxHeight: 'none',
                    m: '5px',
                    borderRadius: { xs: 2.5, md: 4 },
                    overflow: 'hidden',
                    background:
                        'radial-gradient(ellipse at 15% 12%, rgba(224,201,122,0.22) 0%, transparent 52%),' +
                        'radial-gradient(ellipse at 85% 88%, rgba(201,168,76,0.14) 0%, transparent 55%),' +
                        'linear-gradient(160deg, #FAF7F2 0%, #F5EDD9 54%, #FAF7F2 100%)',
                    border: '1px solid rgba(201,168,76,0.25)',
                },
            }}
            BackdropProps={{
                sx: {
                    backgroundColor: 'rgba(19,14,9,0.45)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                },
            }}
        >
            <DialogContent sx={{ p: { xs: 1, md: 1.4 }, height: '100%', position: 'relative' }}>
                <IconButton
                    onClick={onClose}
                    aria-label="סגירת מצגת"
                    sx={{
                        position: 'absolute',
                        top: { xs: 10, md: 14 },
                        left: { xs: 10, md: 14 },
                        zIndex: 5,
                        background: 'rgba(255,255,255,0.8)',
                        border: '1px solid rgba(201,168,76,0.3)',
                        '&:hover': { background: 'rgba(255,255,255,0.95)' },
                    }}
                >
                    <CloseIcon />
                </IconButton>

                <Stack spacing={1.1} sx={{ mb: 1.6, px: { xs: 0.3, md: 2.1 }, pt: { xs: 5.1, md: 1.1 } }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }}>
                        <Box>
                            <Typography sx={{ fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 700, fontSize: { xs: '1.4rem', md: '1.75rem' }, color: '#2C1810' }}>
                                {copy.title}
                            </Typography>
                            <Typography sx={{ color: '#8A6A2B', fontSize: { xs: '0.9rem', md: '0.98rem' } }}>{copy.subtitle}</Typography>
                        </Box>
                        <Chip label={`שלב ${stepIndex} מתוך ${STEP_ORDER.length}`} sx={{ bgcolor: 'rgba(201,168,76,0.17)', color: '#7A5E2B', fontWeight: 700 }} />
                    </Stack>
                    <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                            height: 8,
                            borderRadius: 10,
                            backgroundColor: 'rgba(201,168,76,0.15)',
                            '& .MuiLinearProgress-bar': {
                                background: 'linear-gradient(135deg, #E0C97A, #C9A84C)',
                            },
                        }}
                    />
                </Stack>

                <Box sx={{ px: { xs: 0, md: 1.2 }, height: 'calc(100% - 136px)', overflow: 'auto' }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ duration: 0.35, ease: 'easeOut' }}
                        >
                            {step === 'intro' && (
                                <GoldCard sx={{ textAlign: 'center', maxWidth: 1040, mx: 'auto', mt: { xs: 0.5, md: 3 } }}>
                                    <Typography sx={{ fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 700, fontSize: { xs: '1.7rem', md: '2.15rem' }, color: '#2C1810' }}>
                                        האורחים שלכם יקבלו חוויה חכמה, אישית ומדויקת
                                    </Typography>
                                    <Typography sx={{ mt: 1.2, color: '#7D6140', lineHeight: 1.9, fontSize: { xs: '0.95rem', md: '1.03rem' } }}>
                                        מתחילים מהודעת WhatsApp יפה 30 יום לפני האירוע, ממשיכים לאישור הגעה נוח,
                                        ומסיימים במסך פרטי האירוע עם כל מה שצריך במקום אחד.
                                    </Typography>
                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} justifyContent="center" sx={{ mt: 2.4 }}>
                                        <Chip label="1. הזמנה דיגיטלית" sx={{ bgcolor: 'rgba(201,168,76,0.17)' }} />
                                        <Chip label="2. אישור הגעה" sx={{ bgcolor: 'rgba(201,168,76,0.17)' }} />
                                        <Chip label="3. פרטי אירוע מלאים" sx={{ bgcolor: 'rgba(201,168,76,0.17)' }} />
                                    </Stack>
                                    <Button
                                        variant="contained"
                                        onClick={goNext}
                                        startIcon={<PlayCircleFilledRoundedIcon />}
                                        endIcon={<ArrowBackIcon />}
                                        sx={{ mt: 3, ...ctaButtonSx }}
                                    >
                                        התחל הצצה לחוויית האורח
                                    </Button>
                                </GoldCard>
                            )}

                            {step === 'whatsapp' && (
                                <Stack spacing={2}>
                                    <GoldCard sx={{ maxWidth: 1120, mx: 'auto' }}>
                                        <Typography sx={{ fontWeight: 700, color: '#6E5424' }}>
                                            30 יום לפני האירוע - האורח מקבל הודעת WhatsApp ממותגת עם כל הפרטים החשובים.
                                        </Typography>
                                        <Typography sx={{ mt: 0.7, color: '#8A6A2B', fontSize: '0.9rem' }}>
                                            כחתן וכלה, תוכלו לשנות את מספר הימים מראש בכל רגע מתוך הגדרות התזמון. ולצרף את ההזמנה היפה והייחודית שלכם שתצורף יחד עם ההודעה לכל האורחים שלכם :)
                                        </Typography>
                                    </GoldCard>

                                    <Box sx={{ maxWidth: 1120, overflowX: "hidden", mx: 'auto', width: '100%', position: 'relative' }}>
                                        <Chip
                                            icon={<EastIcon sx={{ transform: 'scaleX(-1)' }} />}
                                            label="אשרו הגעה להמשך :)"
                                            sx={{
                                                zIndex: 2,
                                                bgcolor: 'rgba(12,153,120,0.13)',
                                                border: '1px solid rgba(12,153,120,0.35)',
                                                color: '#0C745D',
                                                fontWeight: 700,
                                                mb: 1,
                                            }}
                                        />
                                        <WhatsAppMessagePreview
                                            image="/wedding-invitation.png"
                                            header="שלום יואב! 💌"
                                            body={INVITATION_BODY}
                                            buttonLabel="לאישור הגעה"
                                            onButtonClick={() => setStep('rsvp')}
                                            maxBubbleWidth={420}
                                            footerText="כך זה נראה לאורח בפועל מתוך WhatsApp"
                                        />
                                    </Box>
                                </Stack>
                            )}

                            {step === 'rsvp' && (
                                <Stack spacing={2.3} sx={{ maxWidth: 1120, mx: 'auto' }}>
                                    <GoldCard>
                                        <Typography sx={{ color: '#7A5B22', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                            <EastIcon sx={{ transform: 'scaleX(-1)' }} />
                                            עכשיו האורח נמצא בתוך האפליקציה בטאב אישור הגעה, ועליו לסמן את בחירתו.
                                        </Typography>
                                    </GoldCard>

                                    <GuestExperiencePhone activeTab="rsvp" onTabClick={handleGuestTabClick}>
                                        <Box sx={{ pb: 0.2 }}>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 0.6,
                                                    color: '#9A7833',
                                                    fontWeight: 700,
                                                    mb: 0.7,
                                                }}
                                            >
                                                <HowToRegIcon sx={{ fontSize: 15 }} />
                                                סטטוס הגעה
                                            </Typography>

                                            <Stack spacing={1.1}>
                                                <Box
                                                    onClick={() => setStatus('COMING')}
                                                    sx={{
                                                        borderRadius: 2.2,
                                                        p: 1.3,
                                                        border: status === 'COMING' ? '2px solid #2E8B57' : '1px solid rgba(201,168,76,0.28)',
                                                        background: status === 'COMING'
                                                            ? 'linear-gradient(145deg, #41A86A, #2E8B57)'
                                                            : 'rgba(255,255,255,0.82)',
                                                        color: status === 'COMING' ? '#fff' : '#2C1810',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    <Typography sx={{ fontWeight: 800 }}>אגיע ❤️</Typography>
                                                    <Typography variant="caption" sx={{ color: status === 'COMING' ? 'rgba(255,255,255,0.92)' : '#8A7565' }}>
                                                        מעולה, בואו נעדכן כמה אנשים מגיעים
                                                    </Typography>
                                                </Box>

                                                <Box
                                                    onClick={() => setStatus('NOT_COMING')}
                                                    sx={{
                                                        borderRadius: 2.2,
                                                        p: 1.3,
                                                        border: status === 'NOT_COMING' ? '2px solid #B9473D' : '1px solid rgba(201,168,76,0.28)',
                                                        background: status === 'NOT_COMING'
                                                            ? 'linear-gradient(145deg, #D46A63, #B9473D)'
                                                            : 'rgba(255,255,255,0.82)',
                                                        color: status === 'NOT_COMING' ? '#fff' : '#2C1810',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    <Typography sx={{ fontWeight: 800 }}>לא אגיע 😔</Typography>
                                                    <Typography variant="caption" sx={{ color: status === 'NOT_COMING' ? 'rgba(255,255,255,0.92)' : '#8A7565' }}>
                                                        להדגמה המלאה בחרו "אגיע" כדי להמשיך לחוויית הפרטים.
                                                    </Typography>
                                                </Box>
                                            </Stack>

                                            {status === 'COMING' && (
                                                <Box
                                                    sx={{
                                                        mt: 1.1,
                                                        p: 1.05,
                                                        borderRadius: 2,
                                                        border: '1px solid rgba(201,168,76,0.28)',
                                                        background: 'rgba(250,247,242,0.9)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 0.7,
                                                    }}
                                                >
                                                    <Typography sx={{ flex: 1, color: '#6B5240', fontWeight: 700, fontSize: '0.9rem' }}>
                                                        כמות מגיעים כולל האורח: {count}
                                                    </Typography>
                                                    <IconButton size="small" onClick={() => setCount((v) => Math.max(1, v - 1))}>
                                                        <RemoveCircleOutlineIcon sx={{ color: '#C9A84C' }} />
                                                    </IconButton>
                                                    <Typography sx={{ minWidth: 18, textAlign: 'center', fontWeight: 800 }}>{count}</Typography>
                                                    <IconButton size="small" onClick={() => setCount((v) => Math.min(8, v + 1))}>
                                                        <AddCircleOutlineIcon sx={{ color: '#C9A84C' }} />
                                                    </IconButton>
                                                </Box>
                                            )}

                                            <Button
                                                variant="contained"
                                                onClick={handleApproveRsvp}
                                                disabled={saving || status !== 'COMING'}
                                                startIcon={saving ? null : <TaskAltRoundedIcon />}
                                                endIcon={saving ? null : <CheckCircleIcon />}
                                                sx={{
                                                    mt: 1.2,
                                                    minWidth: 180,
                                                    ...ctaButtonSx,
                                                    '&.Mui-disabled': {
                                                        color: 'rgba(255,255,255,0.66)',
                                                        background: 'linear-gradient(135deg, rgba(201,168,76,0.65), rgba(154,120,51,0.65))',
                                                    },
                                                }}
                                            >
                                                {saving ? 'שומר אישור הגעה...' : 'אישור הגעה'}
                                            </Button>
                                        </Box>
                                    </GuestExperiencePhone>
                                </Stack>
                            )}

                            {step === 'success' && (
                                <GoldCard sx={{ textAlign: 'center', maxWidth: 1040, mx: 'auto', mt: { xs: 1, md: 6 } }}>
                                    <motion.div
                                        animate={{ y: [0, -8, 0] }}
                                        transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
                                        style={{ display: 'inline-flex' }}
                                    >
                                        <Box
                                            sx={{
                                                width: 74,
                                                height: 74,
                                                borderRadius: '50%',
                                                display: 'grid',
                                                placeItems: 'center',
                                                color: '#fff',
                                                background: 'linear-gradient(145deg, #41A86A, #2E8B57)',
                                                boxShadow: '0 12px 28px rgba(46,139,87,0.36)',
                                                mx: 'auto',
                                                mb: 1.2,
                                            }}
                                        >
                                            <CelebrationIcon sx={{ fontSize: 38 }} />
                                        </Box>
                                    </motion.div>
                                    <Typography sx={{ fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 700, fontSize: { xs: '1.8rem', md: '2.25rem' }, color: '#2C1810' }}>
                                        איזה כיף! אישור ההגעה נקלט בהצלחה
                                    </Typography>
                                    <Typography sx={{ mt: 1, color: '#8A6A2B', fontSize: '1rem' }}>
                                        בדיוק כך האורח שלכם מקבל הודעת הצלחה יפה ומרגשת.
                                    </Typography>
                                    <Typography sx={{ mt: 0.7, color: '#7D6140', fontSize: '0.92rem' }}>
                                        עוברים עכשיו אוטומטית למסך פרטי האירוע...
                                    </Typography>
                                </GoldCard>
                            )}

                            {step === 'details' && (
                                <Stack spacing={1.8} sx={{ maxWidth: 1120, mx: 'auto' }}>
                                    <GoldCard>
                                        <Typography sx={{ color: palette.textMuted, fontWeight: 700 }}>
                                            מדהים, עכשיו האורח במערכת ! :)
                                        </Typography>
                                        <Typography sx={{ color: '#8A6A2B', mt: 0.5, fontSize: '0.92rem' }}>
                                            {guest.full_name} אישר הגעה עבור {guest.number_of_guests} משתתפים.
                                        </Typography>
                                    </GoldCard>

                                    <GuestExperiencePhone activeTab="info" onTabClick={handleGuestTabClick}>
                                        <InfoTab demoInfo={DEMO_WEDDING} hideRegisterCta />
                                    </GuestExperiencePhone>

                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} justifyContent="center" sx={{ pb: 1.5 }}>
                                        <Button
                                            variant="contained"
                                            onClick={onClose}
                                            startIcon={<CheckCircleIcon />}
                                            sx={{ ...ctaButtonSx }}
                                        >
                                            סיום וסגירה
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            startIcon={<RestartAltRoundedIcon />}
                                            onClick={() => setStep('intro')}
                                            sx={{ ...ghostButtonSx }}
                                        >
                                            התחל מחדש את ההצגה
                                        </Button>
                                    </Stack>
                                </Stack>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </Box>

                <Stack direction="row" spacing={1.2} justifyContent="space-between" sx={{ px: { xs: 0.2, md: 2.1 }, mt: 0.9 }}>
                    <Button
                        onClick={goBack}
                        startIcon={<ArrowForwardIcon />}
                        disabled={step === 'intro' || step === 'success'}
                        sx={{
                            visibility: step === 'intro' ? 'hidden' : 'visible',
                            ...ghostButtonSx,
                        }}
                    >
                        חזרה
                    </Button>
                    <Button
                        onClick={goNext}
                        endIcon={<ArrowBackIcon />}
                        disabled={step === 'details' || step === 'success' || step === 'whatsapp' || step === 'rsvp'}
                        sx={{
                            visibility: step === 'details' ? 'hidden' : 'visible',
                            ...ghostButtonSx,
                        }}
                    >
                        המשך
                    </Button>
                </Stack>

                <Dialog
                    open={Boolean(featureHint)}
                    onClose={() => setFeatureHint(null)}
                    fullWidth
                    maxWidth="sm"
                    PaperProps={{
                        sx: {
                            borderRadius: 3,
                            border: '1px solid rgba(201,168,76,0.35)',
                            background:
                                'radial-gradient(ellipse at 12% 10%, rgba(224,201,122,0.18) 0%, transparent 55%),' +
                                'linear-gradient(160deg, #FFFCF6 0%, #F8F0DF 60%, #FFFDF8 100%)',
                        },
                    }}
                >
                    <DialogContent sx={{ p: { xs: 2.2, sm: 2.8 } }}>
                        <Typography
                            sx={{
                                fontFamily: "'Frank Ruhl Libre', serif",
                                fontWeight: 700,
                                fontSize: { xs: '1.4rem', sm: '1.6rem' },
                                color: '#2C1810',
                                mb: 0.7,
                            }}
                        >
                            {featureHint?.title}
                        </Typography>
                        <Typography
                            sx={{
                                whiteSpace: 'pre-line',
                                color: '#7A5E2B',
                                lineHeight: 1.9,
                                fontSize: { xs: '0.95rem', sm: '1rem' },
                            }}
                        >
                            {featureHint?.body}
                        </Typography>
                        <Typography
                            sx={{
                                mt: 2,
                                whiteSpace: 'pre-line',
                                color: palette.textMuted,
                                lineHeight: 1.9,
                                fontSize: { xs: '0.95rem', sm: '1rem' },
                                fontWeight: "bold"
                            }}
                        >
                            סקרנים ? הירשמו ותחוו את כל החוויה השלמה איתנו :)
                        </Typography>

                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                            <Button
                                variant="contained"
                                onClick={() => setFeatureHint(null)}
                                sx={{
                                    ...ctaButtonSx,
                                    px: 2.6,
                                    py: 0.82,
                                }}
                            >
                                הבנתי, ממשיכים
                            </Button>
                        </Box>
                    </DialogContent>
                </Dialog>
            </DialogContent>
        </Dialog>
    );
}