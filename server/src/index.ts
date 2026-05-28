import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import dotenv from 'dotenv';

import authRoutes   from './routes/auth.routes';
import infoRoutes   from './routes/info.routes';
import photosRoutes from './routes/photos.routes';
import tablesRoutes from './routes/tables.routes';
import guestsRoutes from './routes/guests.routes';
import { errorHandler, notFound } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT ?? 5176);
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? 'uploads';

// ─── Middleware ───────────────────────────────────────────────

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin ?? '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Guest-ID');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded photos
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)));

// ─── Routes ──────────────────────────────────────────────────
app.use('/auth',   authRoutes);
app.use('/info',   infoRoutes);
app.use('/photos', photosRoutes);
app.use('/tables', tablesRoutes);
app.use('/guests', guestsRoutes);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ─── Error handling ───────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  console.log(`[Server] ENV: ${process.env.NODE_ENV ?? 'development'}`);
});

export default app;
