import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes';
import infoRoutes from './routes/info.routes';
import photosRoutes from './routes/photos.routes';
import tablesRoutes from './routes/tables.routes';
import guestsRoutes from './routes/guests.routes';
import tasksRoutes from './routes/tasks.routes';
import requestRoutes from './routes/weddingRequest.routes';
import whatsappRoutes from './routes/whatsapp.routes';
import weddingMessageScheduleRoutes from './routes/weddingMessageSchedule.routes';
import { pool } from './db/pool';
import { initWhatsappScheduler, runWhatsappSchedulerOnce } from './jobs/whatsapp-scheduler.job';
import { initWhatsappReconciliationJob } from './jobs/whatsapp-reconciliation.job';

import { errorHandler, notFound } from './middleware/errorHandler';
import mailerRoutes from './routes/mailer.routes';
import { scheduleOneOffTestSendToday1230 } from './jobs/whatsapp-test-send.job';
import { scheduleOneOffTestSendToday1230Reminder } from './jobs/whatsapp-test-send-reminder.job';
import { scheduleOneOffTestSendToday1230DayBefore } from './jobs/whatsapp-test-day-before.job';
import { initWhatsappSchedulePreviewJob } from './jobs/whatsapp-schedule-preview-job';

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT ?? 5176);
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? 'uploads';

// ─────────────────────────────────────────────────────────────
// CORS DEBUG — log every incoming request BEFORE cors runs
// ─────────────────────────────────────────────────────────────

app.use((req, res, next) => {
  // Patch res.setHeader so we can log what CORS headers are being set
  const originalSetHeader = res.setHeader.bind(res);
  res.setHeader = (name: string, value: any) => {
    return originalSetHeader(name, value);
  };

  next();
});

// ─────────────────────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────────────────────

app.use(cors({
  origin: true, // reflects the exact request origin — required for credentials
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Guest-ID'],
}));

// ─────────────────────────────────────────────────────────────
// Body Parsers
// ─────────────────────────────────────────────────────────────

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────────────────────
// Debug Logs (after cors — log what was actually sent)
// ─────────────────────────────────────────────────────────────

app.use((req, res, next) => {
  // For OPTIONS preflight, cors() already sent the response.
  // This middleware only runs for non-OPTIONS requests.
  next();
});

// ─────────────────────────────────────────────────────────────
// Static Uploads
// ─────────────────────────────────────────────────────────────

app.use(
  '/uploads',
  express.static(path.resolve(UPLOAD_DIR)),
);

// ─────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────

app.use('/auth', authRoutes);
app.use('/info', infoRoutes);
app.use('/photos', photosRoutes);
app.use('/tables', tablesRoutes);
app.use('/guests', guestsRoutes);
app.use('/tasks', tasksRoutes);
app.use('/wedding-requests', requestRoutes);
app.use('/weddings', weddingMessageScheduleRoutes);

// API
app.use('/whatsapp', whatsappRoutes);
app.use('/api/mail', mailerRoutes);

// ─────────────────────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  return res.json({
    status: 'ok',
    ts: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────────────────────
// Error Handling
// ─────────────────────────────────────────────────────────────

app.use(notFound);
app.use(errorHandler);

// ─────────────────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 ENV: ${process.env.NODE_ENV ?? 'development'}`);

  initWhatsappScheduler();
  initWhatsappReconciliationJob();
  initWhatsappSchedulePreviewJob();

  // Tests
  // runWhatsappSchedulerOnce().catch(console.error);
  // runWhatsappSchedulePreviewOnce().catch(console.error);
  // scheduleOneOffTestSendToday1230();
  // scheduleOneOffTestSendToday1230Reminder();
  // scheduleOneOffTestSendToday1230DayBefore();
});

// ─────────────────────────────────────────────────────────────
// DB Keep-Alive (prevents free-tier DB pause after 7 days)
// ─────────────────────────────────────────────────────────────
const DB_KEEP_ALIVE_MS = 23 * 60 * 60 * 1000; // 23h

setInterval(async () => {
  try {
    await pool.query('SELECT 1');
    console.log('[DB] Keep-alive ping OK —', new Date().toISOString());
  } catch (err: any) {
    console.error('[DB] Keep-alive ping FAILED:', err.message);
  }
}, DB_KEEP_ALIVE_MS);

// ─────────────────────────────────────────────────────────────
// Render Keep-Alive — self-ping every 10 min to prevent sleep
// ─────────────────────────────────────────────────────────────
const RENDER_KEEP_ALIVE_MS = 10 * 60 * 1000; // 10 min

setInterval(async () => {
  const serviceUrl = process.env.RENDER_EXTERNAL_URL;
  if (!serviceUrl) return; // only runs on Render (env var is set automatically)
  try {
    const res = await fetch(`${serviceUrl}/health`);
    console.log('[Render] Keep-alive ping OK —', new Date().toISOString(), res.status);
  } catch (err: any) {
    console.error('[Render] Keep-alive ping FAILED:', err.message);
  }
}, RENDER_KEEP_ALIVE_MS);

export default app;