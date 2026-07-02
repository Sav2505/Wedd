import { useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  LinearProgress,
  Stack,
  Typography,
} from '@mui/material';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { motion } from 'framer-motion';
import { WeddingTask } from '../../../types/domain';
import { CATEGORY_OPTIONS } from './TaskDialog';

// ─── Bar colors: green (small) → orange (large) ──────────────────────────────────

// ─── Category Colors ──────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  venue:          '#C9A84C', // gold
  photographer:   '#5C3D2E', // dark brown
  dj:             '#3949AB', // indigo
  dress:          '#F06292', // soft pink
  suit:           '#1E88E5', // blue
  rings:          '#FFB300', // amber
  decorations:    '#43A047', // green
  invitations:    '#00ACC1', // cyan
  transportation: '#78909C', // blue-grey
  makeup:         '#FF5722', // deep orange
  hair:           '#AD1457', // dark rose
  rabbi:          '#6D4C41', // brown
  flowers:        '#E53935', // red
  food:           '#8BC34A', // lime green
  alcohol:        '#039BE5', // light blue
  gifts:          '#00897B', // teal
  design:         '#8E24AA', // purple
  lighting:       '#FDD835', // yellow
  side_event:     '#F4511E', // orange-red
  hotel:          '#00695C', // dark teal
  attire:         '#558B2F', // olive
  other:          '#9E9E9E', // grey
};

function fmt(n: number) {
  return `₪${Number(n).toLocaleString('he-IL', { maximumFractionDigits: 0 })}`;
}

function getCategoryLabel(cat: string) {
  const opt = CATEGORY_OPTIONS.find(o => o.value === cat);
  return opt ? `${opt.icon} ${opt.label}` : cat;
}

// ─── Custom Tooltip ───────────────────────────────────────────

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{ bgcolor: 'background.paper', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 2, p: 1.5, boxShadow: 3 }}>
      <Typography variant="body2" fontWeight={700}>{payload[0].name}</Typography>
      <Typography variant="body2" color="primary.main">{fmt(payload[0].value)}</Typography>
    </Box>
  );
}

// ─── Main Component ───────────────────────────────────────────

interface Props {
  tasks: WeddingTask[];
}

export default function BudgetAnalytics({ tasks }: Props) {
  const { pieData, stats, paidPct } = useMemo(() => {
    // Pie: expenses by category
    const catMap: Record<string, number> = {};
    tasks.forEach(t => {
      if (Number(t.total_amount) > 0) {
        catMap[t.category] = (catMap[t.category] ?? 0) + Number(t.total_amount);
      }
    });
    const pieData = Object.entries(catMap)
      .map(([cat, value]) => ({ name: getCategoryLabel(cat), value, cat }))
      .sort((a, b) => b.value - a.value);

    // Stats
    const amounts = tasks.filter(t => Number(t.total_amount) > 0).map(t => Number(t.total_amount));
    const total = tasks.reduce((s, t) => s + Number(t.total_amount), 0);
    const paid  = tasks.reduce((s, t) => s + Number(t.paid_amount), 0);
    const avg   = amounts.length > 0 ? amounts.reduce((s, v) => s + v, 0) / amounts.length : 0;
    const max   = amounts.length > 0 ? Math.max(...amounts) : 0;
    const min   = amounts.length > 0 ? Math.min(...amounts) : 0;
    const topCat = pieData[0] ? pieData[0].name : '—';
    const paidPct = total > 0 ? Math.min(100, (paid / total) * 100) : 0;

    return { pieData, stats: { avg, max, min, topCat, total, paid }, paidPct };
  }, [tasks]);

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.4, ease: 'easeOut' as const } }),
  };

  if (tasks.length === 0) {
    return (
      <Box sx={{ py: 5, textAlign: 'center', color: 'text.secondary', opacity: 0.5 }}>
        <Typography variant="body2">הוסף משימות עם עלויות כדי לראות את ניתוח התקציב</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* ─── Section title ─── */}
      <Typography
        variant="h6"
        sx={{ fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 700, mb: 2.5, color: 'text.primary' }}
      >
        ניתוח תקציב
      </Typography>

      {/* ─── Quick stat cards ─── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        {[
          { label: 'ממוצע להוצאה', value: fmt(stats.avg) },
          { label: 'הוצאה גדולה ביותר', value: fmt(stats.max) },
          { label: 'הוצאה קטנה ביותר', value: fmt(stats.min) },
          { label: 'קטגוריה יקרה ביותר', value: stats.topCat },
        ].map((item, i) => (
          <motion.div key={i} custom={i} variants={cardVariants} initial="hidden" animate="visible">
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', height: '100%' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>{item.label}</Typography>
                <Typography variant="h6" fontWeight={800} sx={{ mt: 0.5, fontSize: '1.05rem' }}>{item.value}</Typography>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </Box>

      {/* ─── Budget Progress ─── */}
      <motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible">
        <Card sx={{ borderRadius: 3, mb: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={700}>התקדמות תשלומים</Typography>
              <Typography variant="subtitle2" color="primary.main" fontWeight={700}>
                {fmt(stats.paid)} / {fmt(stats.total)}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={paidPct}
              sx={{
                height: 12, borderRadius: 6,
                bgcolor: 'rgba(0,0,0,0.08)',
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(90deg, #E0C97A 0%, #C9A84C 50%, #9A7833 100%)',
                  borderRadius: 6,
                },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {Math.round(paidPct)}% מהתקציב שולם
            </Typography>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Pie Chart full width ─── */}
      <motion.div custom={5} variants={cardVariants} initial="hidden" animate="visible">
        <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>הוצאות לפי קטגוריה</Typography>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  innerRadius={60}
                  paddingAngle={2}
                  isAnimationActive
                  animationDuration={800}
                  animationEasing="ease-out"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={CAT_COLORS[entry.cat] ?? '#bdbdbd'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span style={{ fontSize: '0.75rem', color: '#5C3D2E' }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bottom spacer */}
      <Stack direction="row" sx={{ mt: 2, mb: 1 }} />
    </Box>
  );
}
