import { Router } from 'express';
import * as adminController from './admin.controller';
import * as eventController from '../event/event.controller';
import { uploadMedia } from '../event/event.upload';
import * as eventValidation from '../event/event.validation';
import auth from '../../middlewares/auth';
import authorize from '../../middlewares/authorize';
import validate from '../../middlewares/validate';
import * as adminValidation from './admin.validation';

const router = Router();

router.use(auth as any, authorize('admin') as any);

// Dashboard
router.get('/dashboard', adminController.getDashboard);
router.get('/revenue-chart', validate(adminValidation.revenueChart), adminController.getRevenueChart);

// Users
router.get('/users', validate(adminValidation.getUsers), adminController.getUsers);
router.patch('/users/:id/block', validate(adminValidation.userIdParam), adminController.blockUser);
router.patch('/users/:id/unblock', validate(adminValidation.userIdParam), adminController.unblockUser);
router.post('/users/:id/grant-swp', validate(adminValidation.adminGrantSwp), adminController.grantSwp);

// Network
router.get('/network/stats', adminController.getNetworkStats);

// ROI
router.get('/roi-config', adminController.getRoiConfig);
router.patch('/roi-config', validate(adminValidation.updateRoiConfig), adminController.updateRoiConfig);
router.post('/roi/distribute', adminController.distributeRoi);

// Multi-Level Reward Config
router.get('/multilevel-rewards/config', adminController.getMultiLevelRewardConfigs);
router.patch('/multilevel-rewards/config/:level', validate(adminValidation.updateMultiLevelRewardConfig), adminController.updateMultiLevelRewardConfig);

// Level Commission Config (SWP purchase commissions)
router.get('/level-commissions', adminController.getLevelCommissions);
router.patch('/level-commissions/:level', validate(adminValidation.updateLevelCommission), adminController.updateLevelCommission);

// Events
router.post('/events', uploadMedia, eventController.createEvent);
router.get('/events', eventController.getAllEvents);
router.patch('/events/:id', validate(eventValidation.updateEvent), eventController.updateEvent);
router.delete('/events/:id', validate(eventValidation.eventIdParam), eventController.deleteEvent);

// Transactions
router.get('/transactions', validate(adminValidation.getTransactions), adminController.getTransactions);

export default router;
