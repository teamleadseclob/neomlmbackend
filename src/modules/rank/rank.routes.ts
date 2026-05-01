import { Router } from 'express';
import * as rankController from './rank.controller';
import auth from '../../middlewares/auth';

const router = Router();

router.use(auth as any);

router.get('/status', rankController.getRankStatus);
router.get('/rewards/history', rankController.getRewardHistory);

export default router;
