import { Router } from 'express';
import * as withdrawalController from './withdrawal.controller';
import auth from '../../middlewares/auth';
import authorize from '../../middlewares/authorize';
import validate from '../../middlewares/validate';
import * as v from './withdrawal.validation';

// ─── User routes (/api/withdrawal) ───
export const userRouter = Router();
userRouter.use(auth as any);
userRouter.post('/', validate(v.withdraw), withdrawalController.requestWithdrawal);
userRouter.get('/history', validate(v.history), withdrawalController.getHistory);

// ─── Admin routes (/api/admin/withdrawals) ───
export const adminRouter = Router();
adminRouter.use(auth as any, authorize('admin') as any);
adminRouter.get('/', validate(v.adminListWithdrawals), withdrawalController.adminListWithdrawals);
adminRouter.post('/bulk-approve', withdrawalController.bulkApprove);
adminRouter.patch('/:id/approve', validate(v.approveWithdrawal), withdrawalController.approveWithdrawal);
adminRouter.patch('/:id/reject', validate(v.rejectWithdrawal), withdrawalController.rejectWithdrawal);
adminRouter.patch('/:id/retry', validate(v.retryWithdrawal), withdrawalController.retryWithdrawal);
adminRouter.patch('/:id/refund', validate(v.refundWithdrawal), withdrawalController.refundWithdrawal);
