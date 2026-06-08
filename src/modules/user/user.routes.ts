import { Router } from 'express';
import * as userController from './user.controller';
import * as notificationController from '../notification/notification.controller';
import * as userNotificationController from '../notification/user-notification.controller';
import * as rewardWalletController from './reward-wallet.controller';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import * as userValidation from './user.validation';

const router = Router();

router.use(auth as any);

router.get('/dashboard', userController.getDashboard);
router.get('/me', userController.getProfile);
router.get('/me/earning-limits', userController.getEarningLimits);
router.get('/me/income-chart', validate(userValidation.incomeChart), userController.getIncomeChart);
router.patch('/me', validate(userValidation.updateProfile), userController.updateProfile);
router.get('/referrals', userController.getDirectReferrals);
router.post('/send-referral', validate(userValidation.sendReferral), userController.sendReferral);
router.get('/reward-wallet', rewardWalletController.getRewardWallet);
router.get('/reward-wallet/history', rewardWalletController.getRewardWalletHistory);
router.get('/reward-wallet/pool-fund', rewardWalletController.getPoolFundHistory);
router.get('/notifications', notificationController.getEnabledNotifications);
router.get('/notifications/earnings', userNotificationController.getMyNotifications);
router.get('/notifications/earnings/unread-count', userNotificationController.getUnreadCount);
router.patch('/notifications/earnings/:id/read', userNotificationController.markAsRead);
router.patch('/notifications/earnings/read-all', userNotificationController.markAllAsRead);
router.get('/list', validate(userValidation.getUsers), userController.getUsers);
router.get('/:userId', validate(userValidation.getUserById), userController.getUserById);

export default router;
