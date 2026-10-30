import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { authenticate, requireRole } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.js';
import { attendanceRouter } from './routes/attendance.js';
import { locationRouter } from './routes/location.js';
import { ownerRouter } from './routes/owner.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.clientOrigins }));
  app.use(express.json({ limit: '20kb' }));
  app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
  });

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/attendance', authenticate, requireRole('employee'), attendanceRouter);
  app.use('/api/v1/location-events', authenticate, requireRole('employee'), locationRouter);
  app.use('/api/v1/owner', authenticate, requireRole('owner'), ownerRouter);
  app.use('/api', notFound);

  // In production the built React app is served from the same server.
  const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
