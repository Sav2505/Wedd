import { Request, Response } from 'express';
import { updateLogStatusByWhatsappMessageId } from '../services/weddingMessageLog.service';

interface WebhookStatusRow {
  id?: string;
  status?: 'sent' | 'delivered' | 'read' | 'failed' | string;
  errors?: Array<{ code?: number; title?: string; message?: string }>;
}

export function verifyWhatsappWebhook(req: Request, res: Response): void {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode !== 'subscribe') {
    res.status(400).send('Invalid mode');
    return;
  }

  if (token !== process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    res.status(403).send('Forbidden');
    return;
  }

  res.status(200).send(challenge);
}

function mapIncomingStatus(status: string | undefined): 'sent' | 'delivered' | 'read' | 'failed' | null {
  if (!status) return null;
  if (status === 'sent') return 'sent';
  if (status === 'delivered') return 'delivered';
  if (status === 'read') return 'read';
  if (status === 'failed') return 'failed';
  return null;
}

export async function handleWhatsappWebhook(req: Request, res: Response): Promise<void> {
  const statuses: WebhookStatusRow[] = [];

  const entries = Array.isArray((req.body as any)?.entry) ? (req.body as any).entry : [];
  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const changeStatuses = Array.isArray(change?.value?.statuses) ? change.value.statuses : [];
      for (const item of changeStatuses) {
        statuses.push(item as WebhookStatusRow);
      }
    }
  }

  for (const statusRow of statuses) {
    const messageId = statusRow.id;
    const mapped = mapIncomingStatus(statusRow.status);
    if (!messageId || !mapped) {
      continue;
    }

    const firstError = statusRow.errors?.[0];
    const errorMessage = firstError
      ? `${firstError.title ?? 'Meta error'} (${firstError.code ?? 'unknown'}): ${firstError.message ?? ''}`.trim()
      : undefined;

    await updateLogStatusByWhatsappMessageId(messageId, mapped, errorMessage);
  }

  res.status(200).json({ success: true });
}
