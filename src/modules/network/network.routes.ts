import { Router } from 'express';
import * as networkController from './network.controller';
import auth from '../../middlewares/auth';
import authorize from '../../middlewares/authorize';
import validate from '../../middlewares/validate';
import * as networkValidation from './network.validation';

const router = Router();

router.use(auth as any);

router.get(
  '/downline/:userId',
  validate(networkValidation.getDownline),
  networkController.getDownline,
);

router.get(
  '/stats/:userId',
  validate(networkValidation.getUserNetworkStats),
  networkController.getUserNetworkStats,
);

router.get('/stats', authorize('admin') as any, networkController.getNetworkStats);

export default router;
