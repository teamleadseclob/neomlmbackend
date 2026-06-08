import { Router } from 'express';
import * as adminController from './admin.controller';
import * as eventController from '../event/event.controller';
import * as eventValidation from '../event/event.validation';
import * as notificationController from '../notification/notification.controller';
import * as notificationValidation from '../notification/notification.validation';
import auth from '../../middlewares/auth';
import authorize from '../../middlewares/authorize';
import validate from '../../middlewares/validate';
import upload from '../../middlewares/upload';
import * as adminValidation from './admin.validation';
import * as swpController from '../swp/swp.controller';

const router = Router();

router.use(auth as any, authorize('admin') as any);

// Dashboard
router.get('/dashboard', adminController.getDashboard);
router.get('/revenue-chart', validate(adminValidation.revenueChart), adminController.getRevenueChart);

// Users
router.get('/users', validate(adminValidation.getUsers), adminController.getUsers);
router.get('/users/join-chart', adminController.getUserJoinChart);
router.get('/users/:id', validate(adminValidation.userIdParam), adminController.getUserById);
router.patch('/users/:id/block', validate(adminValidation.userIdParam), adminController.blockUser);
router.patch('/users/:id/unblock', validate(adminValidation.userIdParam), adminController.unblockUser);
router.post('/users/:id/grant-swp', validate(adminValidation.adminGrantSwp), adminController.grantSwp);
router.post('/users/:id/add-usdt', validate(adminValidation.addUsdtToWallet), adminController.addUsdtToWallet);
router.get('/pool-config', adminController.getPoolConfig);
router.patch('/pool-config', validate(adminValidation.updatePoolConfig), adminController.updatePoolConfig);
router.post('/pool-fund/distribute', adminController.distributePoolFund);
router.get('/swp-purchases/recent', adminController.getRecentSwpPurchases);

// Network
router.get('/network/stats', adminController.getNetworkStats);

// ROI
router.get('/roi-config', adminController.getRoiConfig);
router.patch('/roi-config', validate(adminValidation.updateRoiConfig), adminController.updateRoiConfig);
router.post('/roi/distribute', adminController.distributeRoi);
router.get('/roi/distributions', adminController.getRoiDistributionHistory);

// Multi-Level Reward Config
router.get('/multilevel-rewards/config', adminController.getMultiLevelRewardConfigs);
router.patch('/multilevel-rewards/config/:level', validate(adminValidation.updateMultiLevelRewardConfig), adminController.updateMultiLevelRewardConfig);

// Level Commission Config (SWP purchase commissions)
router.get('/level-commissions', adminController.getLevelCommissions);
router.patch('/level-commissions/:level', validate(adminValidation.updateLevelCommission), adminController.updateLevelCommission);

// Upload
router.post('/upload', upload.single('file'), adminController.uploadFile);

// Notifications
router.post('/notifications', upload.single('image'), notificationController.createNotification);
router.get('/notifications', notificationController.getAllNotifications);
router.patch('/notifications/:id/toggle', validate(notificationValidation.toggleNotification), notificationController.toggleNotification);
router.delete('/notifications/:id', validate(notificationValidation.notificationIdParam), notificationController.deleteNotification);

// Events
router.post('/events', validate(eventValidation.createEvent), eventController.createEvent);
router.get('/events', eventController.getAllEvents);
router.patch('/events/:id', validate(eventValidation.updateEvent), eventController.updateEvent);
router.delete('/events/:id', validate(eventValidation.eventIdParam), eventController.deleteEvent);

// SWP
router.get('/swp/packages', swpController.getPackages);

// Transactions
router.get('/transactions', validate(adminValidation.getTransactions), adminController.getTransactions);

// Change User Password & Email
router.patch('/users/:id/change-password', validate(adminValidation.changeUserPassword), adminController.changeUserPassword);
router.patch('/users/:id/change-email', validate(adminValidation.changeUserEmail), adminController.changeUserEmail);

// 2FA Management
router.patch('/users/:id/disable-2fa', validate(adminValidation.userIdParam), adminController.adminDisable2FA);

export default router;
