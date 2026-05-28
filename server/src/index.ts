import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes';
import infoRoutes from './routes/info.routes';
import photosRoutes from './routes/photos.routes';
import tablesRoutes from './routes/tables.routes';
import guestsRoutes from './routes/guests.routes';

import { errorHandler, notFound } from './middleware/errorHandler';

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT ?? 5176);
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? 'uploads';

// ─────────────────────────────────────────────────────────────
// CORS DEBUG — log every incoming request BEFORE cors runs
// ─────────────────────────────────────────────────────────────

app.use((req, res, next) => {
  console.log(`\n━━━ INCOMING REQUEST ━━━`);
  console.log(`  Method : ${req.method}`);
  console.log(`  URL    : ${req.originalUrl}`);
  console.log(`  Origin : ${req.headers.origin ?? '(none)'}`);
  console.log(`  Host   : ${req.headers.host}`);

  // Patch res.setHeader so we can log what CORS headers are being set
  const originalSetHeader = res.setHeader.bind(res);
  res.setHeader = (name: string, value: any) => {
    if (name.toLowerCase().startsWith('access-control')) {
      console.log(`  [CORS header set] ${name}: ${value}`);
    }
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
  console.log(`  [After CORS] continuing to route handler...`);
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
});

export default app;