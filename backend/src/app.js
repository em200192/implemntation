import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.js';
import { clientsRouter } from './routes/clients.js';
import { plansRouter } from './routes/plans.js';
import { approvalsRouter } from './routes/approvals.js';
import { sessionsRouter } from './routes/sessions.js';
import { extensionsRouter } from './routes/extensions.js';
import { reportsRouter } from './routes/reports.js';
import { auditRouter } from './routes/audit.js';

export const createApp = () => {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  app.use('/api/auth', authRouter);
  app.use('/api/clients', clientsRouter);
  app.use('/api/plans', plansRouter);
  app.use('/api/approvals', approvalsRouter);
  app.use('/api/sessions', sessionsRouter);
  app.use('/api/extensions', extensionsRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/audit', auditRouter);

  return app;
};
