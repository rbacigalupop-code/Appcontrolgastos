import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';

import authRouter from './modules/auth/auth.router';
import usersRouter from './modules/users/users.router';
import familiesRouter from './modules/families/families.router';
import categoriesRouter from './modules/categories/categories.router';
import transactionsRouter from './modules/transactions/transactions.router';
import savingsRouter from './modules/savings/savings.router';
import investmentsRouter from './modules/investments/investments.router';
import budgetsRouter from './modules/budgets/budgets.router';
import analyticsRouter from './modules/analytics/analytics.router';
import notificationsRouter from './modules/notifications/notifications.router';
import exportRouter from './modules/export/export.router';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/families', familiesRouter);
app.use('/api/v1/categories', categoriesRouter);
app.use('/api/v1/transactions', transactionsRouter);
app.use('/api/v1/savings', savingsRouter);
app.use('/api/v1/investments', investmentsRouter);
app.use('/api/v1/budgets', budgetsRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/export', exportRouter);
app.get('/api/v1/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Serve compiled frontend in production
const frontendDist = path.resolve(__dirname, '../../frontend/dist');
if (env.NODE_ENV === 'production' && fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
}

app.use(errorHandler);

if (require.main === module) {
  app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`🚀 Server on http://0.0.0.0:${env.PORT} [${env.NODE_ENV}]`);
  });
}

export default app;
