import path from 'path';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimiter from './middlewares/rateLimiter';
import errorHandler from './middlewares/errorHandler';
import logger from './config/logger';
import ApiError from './utils/ApiError';

import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/user/user.routes';
import networkRoutes from './modules/network/network.routes';
import adminRoutes from './modules/admin/admin.routes';
import swpRoutes from './modules/swp/swp.routes';
import investmentRoutes from './modules/investment/investment.routes';
import rankRoutes from './modules/rank/rank.routes';
import roiRoutes from './modules/roi/roi.routes';
import mlrRoutes from './modules/multilevel-rewards/multilevel-rewards.routes';
import rankBonusRoutes from './modules/rank-bonus/rank-bonus.routes';
import { userRouter as withdrawalUserRoutes, adminRouter as withdrawalAdminRoutes } from './modules/withdrawal/withdrawal.routes';
import walletRoutes from './modules/wallet/wallet.routes';
import eventRoutes from './modules/event/event.routes';
import { userRouter as supportUserRoutes, adminRouter as supportAdminRoutes } from './modules/support/support.routes';
import { userRouter as kycUserRoutes, adminRouter as kycAdminRoutes } from './modules/kyc/kyc.routes';
import { userRouter as marketUserRoutes, adminRouter as marketAdminRoutes } from './modules/market/market.routes';
import reportRoutes from './modules/report/report.routes';

const app = express();

// Trust proxy (behind Nginx/load balancer)
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(rateLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info({ method: req.method, url: req.url, ip: req.ip }, 'Incoming request');
  next();
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'NEO MLM API is running',
    timestamp: new Date().toISOString(),
  });
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/network', networkRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/swp', swpRoutes);
app.use('/api/investment', investmentRoutes);
app.use('/api/rank', rankRoutes);
app.use('/api/roi', roiRoutes);
app.use('/api/multilevel-rewards', mlrRoutes);
app.use('/api/admin/rank-bonus', rankBonusRoutes);
app.use('/api/withdrawal', withdrawalUserRoutes);
app.use('/api/admin/withdrawals', withdrawalAdminRoutes);
app.use('/api/admin/wallet', walletRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/support', supportUserRoutes);
app.use('/api/admin/support', supportAdminRoutes);
app.use('/api/kyc', kycUserRoutes);
app.use('/api/admin/kyc', kycAdminRoutes);
app.use('/api/market', marketUserRoutes);
app.use('/api/admin/market', marketAdminRoutes);
app.use('/api/admin/reports', reportRoutes);

app.use((req: Request, _res: Response, next: NextFunction) => {
  next(ApiError.notFound(`Route ${req.originalUrl} not found`));
});

app.use(errorHandler);

export default app;
