import { useMemo } from 'react';
import { Box, Card, CardContent, LinearProgress, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PaymentsIcon from '@mui/icons-material/Payments';
import SavingsIcon from '@mui/icons-material/Savings';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CalculateIcon from '@mui/icons-material/Calculate';
import { WeddingTask } from '../../../types/domain';

// ─── Helpers ─────────────────────────────────────────────────

function fmt(n: number) {
  return `₪${n.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ─── Animated Counter ────────────────────────────────────────

function AnimCounter({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {prefix}{value.toLocaleString('he-IL', { maximumFractionDigits: 0 })}{suffix}
    </motion.span>
  );
}

// ─── Single Summary Card ─────────────────────────────────────

interface CardData {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon: React.ReactNode;
  accent?: string;
  delay: number;
}

function SummaryCard({ label, value, sub, icon, accent = '#C9A84C', delay }: CardData) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay, ease: 'easeOut' }}
      style={{ height: '100%' }}
    >
      <Card
        sx={{
          height: '100%',
          borderRadius: 3,
          boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'box-shadow 0.25s, transform 0.25s',
          '&:hover': { boxShadow: '0 6px 24px rgba(0,0,0,0.12)', transform: 'translateY(-2px)' },
        }}
      >
        {/* Accent left border */}
        <Box sx={{ position: 'absolute', top: 0, right: 0, width: 4, height: '100%', background: accent, borderRadius: '0 4px 4px 0' }} />
        <CardContent sx={{ p: 2.5, pr: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.78rem', lineHeight: 1.3 }}>
              {label}
            </Typography>
            <Box sx={{ color: accent, opacity: 0.8, ml: 1 }}>{icon}</Box>
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.1, mb: sub ? 1 : 0 }}>
            {value}
          </Typography>
          {sub}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────

interface Props {
  tasks: WeddingTask[];
  guestCount: number;
}

export default function TaskSummaryCards({ tasks, guestCount }: Props) {
  const stats = useMemo(() => {
    const total       = tasks.length;
    const completed   = tasks.filter(t => t.status === 'completed').length;
    const pending     = tasks.filter(t => !['completed', 'cancelled'].includes(t.status)).length;
    const budget      = tasks.reduce((s, t) => s + Number(t.total_amount), 0);
    const paid        = tasks.reduce((s, t) => s + Number(t.paid_amount), 0);
    const remaining   = budget - paid;
    const deposits    = tasks.reduce((s, t) => s + Number(t.deposit), 0);
    const income      = guestCount * 450 * 0.9;
    const profitLoss  = income - budget;
    const paidPct     = budget > 0 ? Math.min(100, (paid / budget) * 100) : 0;
    const completePct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, budget, paid, remaining, deposits, income, profitLoss, paidPct, completePct };
  }, [tasks, guestCount]);

  const isProfitable = stats.profitLoss >= 0;

  const cards: CardData[] = [
    {
      label: 'סה"כ משימות',
      value: <AnimCounter value={stats.total} suffix=" משימות" />,
      icon: <AssignmentIcon />,
      delay: 0,
    },
    {
      label: 'הושלמו',
      value: <AnimCounter value={stats.completed} suffix=" הושלמו" />,
      sub: (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">{stats.completePct}% הושלם</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={stats.completePct}
            sx={{
              height: 6, borderRadius: 3,
              bgcolor: 'rgba(0,0,0,0.08)',
              '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #81c784, #4caf50)', borderRadius: 3 },
            }}
          />
        </Box>
      ),
      icon: <CheckCircleOutlineIcon />,
      accent: '#4caf50',
      delay: 0.06,
    },
    {
      label: 'ממתינות לביצוע',
      value: <AnimCounter value={stats.pending} suffix=" נותרו" />,
      icon: <PendingActionsIcon />,
      accent: '#ff9800',
      delay: 0.12,
    },
    {
      label: 'תקציב החתונה',
      value: <AnimCounter value={stats.budget} prefix="₪" />,
      icon: <AccountBalanceWalletIcon />,
      delay: 0.18,
    },
    {
      label: 'שולם עד כה',
      value: <AnimCounter value={stats.paid} prefix="₪" />,
      sub: (
        <Box>
          <LinearProgress
            variant="determinate"
            value={stats.paidPct}
            sx={{
              height: 6, borderRadius: 3, mt: 1,
              bgcolor: 'rgba(0,0,0,0.08)',
              '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #E0C97A, #C9A84C)', borderRadius: 3 },
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {Math.round(stats.paidPct)}% מהתקציב שולם
          </Typography>
        </Box>
      ),
      icon: <PaymentsIcon />,
      accent: '#C9A84C',
      delay: 0.24,
    },
    {
      label: 'נותר לתשלום',
      value: <AnimCounter value={stats.remaining} prefix="₪" />,
      icon: <SavingsIcon />,
      accent: stats.remaining > 0 ? '#ef5350' : '#4caf50',
      delay: 0.30,
    },
    {
      label: 'מקדמות ששולמו',
      value: <AnimCounter value={stats.deposits} prefix="₪" />,
      icon: <AccountBalanceWalletIcon />,
      accent: '#7b57c9',
      delay: 0.36,
    },
    {
      label: 'הכנסה צפויה',
      value: <>{fmt(stats.income)}</>,
      sub: (
        <Typography variant="caption" color="text.secondary">
          {guestCount} אורחים × ₪450 × 90%
        </Typography>
      ),
      icon: <TrendingUpIcon />,
      accent: '#26a69a',
      delay: 0.42,
    },
    {
      label: 'רווח / הפסד צפוי',
      value: (
        <Typography
          component="span"
          variant="h5"
          sx={{ fontWeight: 800, color: isProfitable ? '#2e7d32' : '#c62828', lineHeight: 1.1 }}
        >
          {isProfitable ? '+' : ''}{fmt(stats.profitLoss)}
        </Typography>
      ),
      icon: <CalculateIcon />,
      accent: isProfitable ? '#4caf50' : '#ef5350',
      delay: 0.48,
    },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      {cards.map((card, i) => (
        <SummaryCard key={i} {...card} />
      ))}
    </Box>
  );
}
