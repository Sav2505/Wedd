import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import {
  Alert, Box, Button, Checkbox, CircularProgress, FormControlLabel, IconButton,
  Stack, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SaveIcon from '@mui/icons-material/Save';
import {
  getGroupMessageSchedule, saveGroupMessageSchedule,
  type GroupMessageTemplate, type GroupScheduleData,
} from '../services/weddingMessageSchedule.service';

dayjs.extend(utc);
dayjs.extend(timezone);

type GroupId = string | null;
interface Slot { key: number; localDateTime: string; groupIds: GroupId[] }

const templates: Array<{ value: GroupMessageTemplate; label: string }> = [
  { value: 'wedding_confirmation', label: 'הזמנה' },
  { value: 'wedding_reminder', label: 'תזכורת' },
  { value: 'wedding_day_before', label: 'לקראת האירוע' },
  { value: 'wedding_post_thanks', label: 'תודה' },
];

function localDateTime(value: string): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(value)).replace(' ', 'T');
}

function makeDraft(data: GroupScheduleData, template: GroupMessageTemplate): { slots: Slot[]; excluded: GroupId[] } {
  const rows = data.schedules.filter((row) => row.template_name === template);
  const grouped = new Map<string, GroupId[]>();
  const excluded: GroupId[] = [];
  rows.forEach((row) => {
    if (row.status === 'excluded') excluded.push(row.guest_group_id);
    else if (row.scheduled_at) {
      const date = localDateTime(row.scheduled_at);
      grouped.set(date, [...(grouped.get(date) ?? []), row.guest_group_id]);
    }
  });
  const slots = Array.from(grouped, ([date, groupIds], index) => ({ key: index, localDateTime: date, groupIds }));
  return { slots: slots.length ? slots : [{ key: 0, localDateTime: '', groupIds: [] }], excluded };
}

export default function GroupMessageScheduleEditor({ weddingId, onActiveTemplatesChange, onInvitationStartedChange }: { weddingId: number; onActiveTemplatesChange: (templates: GroupMessageTemplate[]) => void; onInvitationStartedChange: (started: boolean) => void }) {
  const [data, setData] = useState<GroupScheduleData | null>(null);
  const [template, setTemplate] = useState<GroupMessageTemplate>('wedding_confirmation');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [excluded, setExcluded] = useState<GroupId[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    getGroupMessageSchedule(weddingId).then((result) => {
      if (!active) return;
      setData(result);
      onActiveTemplatesChange([...new Set(result.schedules.map((row) => row.template_name))]);
      onInvitationStartedChange(result.schedules.some((row) => row.template_name === 'wedding_confirmation' && ['processing', 'completed', 'paused_error'].includes(row.status)));
      const initialTemplate: GroupMessageTemplate = result.invitation_locked ? 'wedding_reminder' : 'wedding_confirmation';
      setTemplate(initialTemplate);
      const draft = makeDraft(result, initialTemplate);
      setSlots(draft.slots);
      setExcluded(draft.excluded);
    }).catch(() => {
      if (active) setMessage({ type: 'error', text: 'לא ניתן לטעון את תזמון הקבוצות' });
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [weddingId, onActiveTemplatesChange, onInvitationStartedChange]);

  function chooseTemplate(next: GroupMessageTemplate) {
    if (!data) return;
    setTemplate(next);
    const draft = makeDraft(data, next);
    setSlots(draft.slots);
    setExcluded(draft.excluded);
    setMessage(null);
  }

  if (loading) return <CircularProgress size={22} />;
  if (!data) return <Alert severity="error">לא ניתן לטעון את תזמון הקבוצות</Alert>;

  const rows = data.schedules.filter((row) => row.template_name === template);
  const templateLocked = template === 'wedding_confirmation' && data.invitation_locked;
  const lockedIds = rows.filter((row) => ['processing', 'completed', 'paused_error'].includes(row.status)).map((row) => row.guest_group_id);
  const countFor = (group: GroupScheduleData['groups'][number]) =>
    template === 'wedding_confirmation' ? group.total : template === 'wedding_reminder' ? group.pending : group.coming;
  const assigned = slots.flatMap((slot) => slot.groupIds);
  const missing = data.groups.filter((group) => !assigned.includes(group.group_id) && !excluded.includes(group.group_id));
  const oversized = data.groups.filter((group) => !lockedIds.includes(group.group_id) && !excluded.includes(group.group_id) && countFor(group) > 250);
  const slotsMissingDate = slots.some((slot) => slot.groupIds.length > 0 && !slot.localDateTime);
  const otherSends = data.schedules.filter((row) => row.template_name !== template && row.status === 'scheduled' && row.scheduled_at).map((row) => {
    const group = data.groups.find((item) => item.group_id === row.guest_group_id);
    const count = !group ? 0 : row.template_name === 'wedding_confirmation' ? group.total : row.template_name === 'wedding_reminder' ? group.pending : group.coming;
    return { time: new Date(row.scheduled_at!).getTime(), count };
  });
  const selectedSends = slots.filter((slot) => slot.localDateTime && slot.groupIds.length).map((slot) => ({
    time: dayjs.tz(slot.localDateTime, 'Asia/Jerusalem').valueOf(),
    count: data.groups.filter((group) => slot.groupIds.includes(group.group_id)).reduce((sum, group) => sum + countFor(group), 0),
  }));
  const projectedSends = [...otherSends, ...selectedSends];
  const projectedOverflow = projectedSends.some((send) => projectedSends
    .filter((other) => other.time > send.time - 24 * 60 * 60 * 1000 && other.time <= send.time)
    .reduce((sum, other) => sum + other.count, 0) > 250);

  async function save() {
    if (!data) return;
    setSaving(true);
    setMessage(null);
    try {
      const assignments = data.groups.map((group) => {
        const slot = slots.find((item) => item.groupIds.includes(group.group_id));
        return { groupId: group.group_id, excluded: excluded.includes(group.group_id), localDateTime: slot?.localDateTime ?? null };
      });
      await saveGroupMessageSchedule(weddingId, template, assignments);
      const updated = await getGroupMessageSchedule(weddingId);
      setData(updated);
      onActiveTemplatesChange([...new Set(updated.schedules.map((row) => row.template_name))]);
      onInvitationStartedChange(updated.schedules.some((row) => row.template_name === 'wedding_confirmation' && ['processing', 'completed', 'paused_error'].includes(row.status)));
      const draft = makeDraft(updated, template);
      setSlots(draft.slots);
      setExcluded(draft.excluded);
      setMessage({ type: 'success', text: 'תזמון הקבוצות נשמר' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'שגיאה בשמירת התזמון' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2, mt: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>תזמון לפי קבוצות</Typography>
      {!data.enabled && <Alert severity="warning" sx={{ mt: 1 }}>
        השרת עדיין לא מאפשר שמירת תזמון קבוצות: {data.disabled_reasons?.length ? data.disabled_reasons.join(' · ') : 'גרסת ה־BE שרצה אינה מחזירה פירוט אבחון; יש לפרוס את גרסת ה־BE העדכנית.'}
        {' '}מחסום 24 השעות אינו מונע שמירה.
      </Alert>}
      {data.invitation_locked && <Alert severity="info" sx={{ mt: 1 }}>ההזמנה הראשונית כבר נשלחה ולכן אינה ניתנת לתזמון מחדש. נבחרה לשונית התזכורת.</Alert>}
      {message && <Alert severity={message.type} sx={{ mt: 1 }}>{message.text}</Alert>}
      <Tabs value={template} onChange={(_, value: GroupMessageTemplate) => chooseTemplate(value)} variant="scrollable" scrollButtons="auto" aria-label="סוג הודעה">
        {templates.map((item) => <Tab key={item.value} value={item.value} label={item.label} />)}
      </Tabs>
      <Stack spacing={2} sx={{ mt: 2 }}>
        {templateLocked && <Alert severity="warning">ההזמנה כבר נשלחה בעבר. לא ניתן לשנות או לתזמן אותה מחדש, כדי למנוע הודעות כפולות.</Alert>}
        {rows.some((row) => row.status === 'paused_quota') && <Alert severity="warning">השליחה הושהתה משום שמכסת ההודעות מלאה.</Alert>}
        {rows.some((row) => row.status === 'paused_schedule') && <Alert severity="warning">מועד חלף או שפרטי השליחה אינם שלמים. יש לעדכן את התזמון.</Alert>}
        {rows.some((row) => row.status === 'paused_error') && <Alert severity="error">שליחה הושהתה ויש לבדוק את מצב ההודעות לפני חידושה.</Alert>}
        {lockedIds.length > 0 && <Alert severity="info">קבוצות שכבר החלו להישלח אינן ניתנות לעריכה; ניתן לשנות מועדים עתידיים.</Alert>}
        {rows.filter((row) => !['scheduled', 'excluded'].includes(row.status)).map((row) => {
          const group = data.groups.find((item) => item.group_id === row.guest_group_id);
          const status = row.status === 'completed' ? 'הושלמה' : row.status === 'processing' ? 'נשלחת' : 'הושהתה';
          return <Typography key={row.id} variant="body2" color="text.secondary">{group?.name ?? 'ללא קבוצה'}: {status} · נשלחו {row.sent_count}{row.skipped_count ? ` · לא נשלחו ${row.skipped_count}` : ''}{row.problem_count ? ` · דורשות בדיקה ${row.problem_count}` : ''}{row.status_detail ? ` · ${row.status_detail}` : ''}</Typography>;
        })}
        {slots.map((slot, index) => {
          const recipientCount = data.groups.filter((group) => slot.groupIds.includes(group.group_id)).reduce((sum, group) => sum + countFor(group), 0);
          const slotLocked = slot.groupIds.some((groupId) => lockedIds.includes(groupId));
          return (
            <Box key={slot.key} sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 2 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                <Typography variant="subtitle2">מועד {index + 1} · {recipientCount} רשומות</Typography>
                <Tooltip title="הסרת מועד"><span><IconButton aria-label="הסרת מועד" disabled={templateLocked || slotLocked || saving || slots.length === 1} onClick={() => setSlots((current) => current.filter((item) => item.key !== slot.key))}><DeleteOutlineIcon /></IconButton></span></Tooltip>
              </Stack>
              <TextField type="datetime-local" label="תאריך ושעה בישראל" value={slot.localDateTime} size="small" fullWidth
                disabled={templateLocked || slotLocked || saving} InputLabelProps={{ shrink: true }}
                onChange={(event) => setSlots((current) => current.map((item) => item.key === slot.key ? { ...item, localDateTime: event.target.value } : item))} />
              {recipientCount > 250 && <Alert severity="warning" sx={{ mt: 1 }}>מספר הרשומות במועד זה גדול מ־250. המכסה מחושבת לאורך 24 שעות.</Alert>}
              <Stack direction="row" flexWrap="wrap" sx={{ mt: 1 }}>
                {data.groups.map((group) => {
                  const checked = slot.groupIds.includes(group.group_id);
                  const unavailable = !checked && (assigned.includes(group.group_id) || excluded.includes(group.group_id));
                  return <FormControlLabel key={group.group_id ?? 'ungrouped'} label={`${group.name} (${countFor(group)})`}
                    control={<Checkbox checked={checked} disabled={templateLocked || lockedIds.includes(group.group_id) || saving || unavailable} onChange={(event) => setSlots((current) => current.map((item) => item.key !== slot.key ? item : {
                      ...item, groupIds: event.target.checked ? [...item.groupIds, group.group_id] : item.groupIds.filter((id) => id !== group.group_id),
                    }))} />} />;
                })}
              </Stack>
            </Box>
          );
        })}
        <Button startIcon={<AddIcon />} onClick={() => setSlots((current) => [...current, { key: Math.max(-1, ...current.map((slot) => slot.key)) + 1, localDateTime: '', groupIds: [] }])} disabled={templateLocked || saving} sx={{ alignSelf: 'flex-start' }}>הוספת מועד</Button>
        <Typography variant="subtitle2">קבוצות מוחרגות</Typography>
        <Stack direction="row" flexWrap="wrap">
          {data.groups.map((group) => <FormControlLabel key={group.group_id ?? 'ungrouped'} label={`${group.name} (${countFor(group)})`}
            control={<Checkbox checked={excluded.includes(group.group_id)} disabled={templateLocked || lockedIds.includes(group.group_id) || saving || assigned.includes(group.group_id)} onChange={(event) => setExcluded((current) => event.target.checked ? [...current, group.group_id] : current.filter((id) => id !== group.group_id))} />} />)}
        </Stack>
        {missing.length > 0 && <Alert severity="info">טרם שובצו או הוחרגו: {missing.map((group) => group.name).join(', ')}</Alert>}
        {oversized.length > 0 && <Alert severity="error">יש לחלק קבוצות עם יותר מ־250 רשומות: {oversized.map((group) => group.name).join(', ')}</Alert>}
        {slotsMissingDate && <Alert severity="info">בחר תאריך ושעה לכל מועד שאליו שויכה קבוצה.</Alert>}
        {projectedOverflow && <Alert severity="warning">לפי מספר הזכאים הנוכחי, מתוכננות יותר מ־250 הודעות בחלון של 24 שעות. המספר עשוי להשתנות לפני השליחה.</Alert>}
        <Button variant="outlined" startIcon={<SaveIcon />} onClick={save} disabled={!data.enabled || templateLocked || saving || missing.length > 0 || oversized.length > 0 || slotsMissingDate} sx={{ alignSelf: 'flex-start' }}>שמירת תזמון הקבוצות</Button>
      </Stack>
    </Box>
  );
}