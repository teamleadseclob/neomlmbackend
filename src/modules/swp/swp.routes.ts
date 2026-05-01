import { Router } from 'express';
import * as swpController from './swp.controller';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import * as swpValidation from './swp.validation';

const router = Router();

router.use(auth as any);

router.get('/packages', swpController.getPackages);
router.post('/purchase', validate(swpValidation.purchase), swpController.purchase);
router.get('/status', swpController.getStatus);
router.get('/purchases', swpController.getPurchaseHistory);
router.get('/commissions', validate(swpValidation.commissionHistory), swpController.getCommissionHistory);
router.get('/team-stats', swpController.getTeamStats);

export default router;
