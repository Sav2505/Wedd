import { useEffect, useState } from 'react';
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
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { createGuestCustomMessage, listMyGuestCustomMessages } from '../services/guestCustomMessages.service';
import { GuestCustomMessageAudience, GuestCustomMessageRequest, GuestCustomMessageStatus } from '../types/domain';

interface Props {
  open: boolean;
  weddingId: number;
  isDeclarationConfirmed: boolean;
  onClose: () => void;
}

function getIsraelDateTimeLocal(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(Date.now() + 60 * 60 * 1000));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

function israelLocalToIso(value: string): string {
  const [datePart, timePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = desired;
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(candidate)).map((part) => [part.type, part.value]));
    const represented = Date.UTC(
      Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute),
    );
    candidate += desired - represented;
  }
  return new Date(candidate).toISOString();
}

function statusPresentation(status: GuestCustomMessageStatus): { label: string; color: 'default' | 'warning' | 'success' | 'error' } {
  switch (status) {
    case 'pending_approval': return { label: 'ממתינה לאישור', color: 'warning' };
    case 'approved': return { label: 'אושרה', color: 'success' };
    case 'rejected': return { label: 'נדחתה', color: 'error' };
    case 'sending': return { label: 'נשלחת', color: 'warning' };
    case 'sent': return { label: 'נשלחה', color: 'success' };
    case 'sent_with_errors': return { label: 'נשלחה חלקית', color: 'error' };
    case 'expired': return { label: 'פג תוקף', color: 'default' };
  }
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', dateStyle: 'short', timeStyle: 'short' });
}

export default function GuestCustomMessageModal({ open, weddingId, isDeclarationConfirmed, onClose }: Props) {
  const [audience, setAudience] = useState<GuestCustomMessageAudience>('COMING');
  const [messageBody, setMessageBody] = useState('');
  const [scheduledAt, setScheduledAt] = useState(getIsraelDateTimeLocal);
  const [requests, setRequests] = useState<GuestCustomMessageRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!open || weddingId <= 0) return;
    let active = true;
    listMyGuestCustomMessages(weddingId)
      .then((items) => { if (active) setRequests(items); })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'טעינת הבקשות נכשלה');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, weddingId]);

  async function submitRequest() {
    if (!scheduledAt || new Date(israelLocalToIso(scheduledAt)).getTime() <= Date.now()) {
      setError('יש לבחור מועד עתידי לפי שעון ישראל.');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      setNotice(null);
      const result = await createGuestCustomMessage({
        weddingId,
        audience,
        message_body: messageBody.trim(),
        scheduled_at: israelLocalToIso(scheduledAt),
      });
      setRequests((current) => [result.request, ...current]);
      setMessageBody('');
      setNotice(result.admin_notification_sent
        ? 'הבקשה נשלחה לאישור האדמין.'
        : 'הבקשה נשמרה, אך לא ניתן היה לשלוח מייל לאדמין.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שליחת הבקשה נכשלה');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth="sm" dir="rtl">
      <DialogTitle sx={{ fontFamily: "'Frank Ruhl Libre', serif", fontWeight: 700 }}>
        הודעת WhatsApp לאורחים
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {!isDeclarationConfirmed && <Alert severity="warning">יש לאשר תחילה את הסכמת WhatsApp.</Alert>}
          {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
          {notice && <Alert severity={notice.startsWith('הבקשה נשמרה') ? 'warning' : 'success'} onClose={() => setNotice(null)}>{notice}</Alert>}

          <FormControl>
            <FormLabel>למי לשלוח?</FormLabel>
            <RadioGroup value={audience} onChange={(event) => setAudience(event.target.value as GuestCustomMessageAudience)}>
              <FormControlLabel value="COMING" control={<Radio />} label="אישרו הגעה" />
              <FormControlLabel value="PENDING" control={<Radio />} label="טרם אישרו הגעה" />
              <FormControlLabel value="ALL" control={<Radio />} label="כולם" />
            </RadioGroup>
          </FormControl>

          <TextField
            label="מועד שליחה (שעון ישראל)"
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
            inputProps={{ min: getIsraelDateTimeLocal() }}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          <TextField
            label="תוכן ההודעה"
            value={messageBody}
            onChange={(event) => setMessageBody(event.target.value.slice(0, 1024))}
            multiline
            minRows={4}
            maxRows={8}
            helperText={`${messageBody.length}/1,024`}
            fullWidth
          />

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>בקשות קודמות</Typography>
            {loading ? <CircularProgress size={22} /> : requests.length === 0 ? (
              <Typography variant="body2" color="text.secondary">אין בקשות קודמות.</Typography>
            ) : (
              <Stack spacing={1}>
                {requests.map((request) => {
                  const presentation = statusPresentation(request.status);
                  const wasApproved = ['approved', 'sending', 'sent', 'sent_with_errors'].includes(request.status);
                  return (
                    <Box key={request.id} sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 1 }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                        <Typography variant="body2">{formatDate(request.scheduled_at)}</Typography>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          {wasApproved && <CheckCircleOutlineIcon color="success" fontSize="small" titleAccess="אושר על ידי האדמין" />}
                          <Chip size="small" label={presentation.label} color={presentation.color} />
                        </Stack>
                      </Stack>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>{request.message_body}</Typography>
                      {request.admin_note && <Alert severity="info" sx={{ mt: 0.75 }}>{request.admin_note}</Alert>}
                      {request.recipient_count !== undefined && request.status !== 'pending_approval' && (
                        <Typography variant="caption" color="text.secondary">
                          נשלחו {request.sent_count ?? 0} מתוך {request.recipient_count}
                          {(request.failed_count ?? 0) > 0 ? ` · נכשלו ${request.failed_count}` : ''}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>סגירה</Button>
        <Button
          variant="contained"
          onClick={submitRequest}
          disabled={submitting || !isDeclarationConfirmed || !messageBody.trim() || !scheduledAt}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          שליחת בקשה לאישור
        </Button>
      </DialogActions>
    </Dialog>
  );
}