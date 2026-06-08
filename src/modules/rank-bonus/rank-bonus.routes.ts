import { Router } from 'express';
import auth from '../../middlewares/auth';
import authorize from '../../middlewares/authorize';
import validate from '../../middlewares/validate';
import * as controller from './rank-bonus.controller';
import { updateConfigSchema, updateAmountConfigSchema, historyQuerySchema } from './rank-bonus.validation';

const router = Router();

router.use(auth as any);
router.use(authorize('admin') as any);

router.post('/distribute', controller.distribute);
router.get('/history', validate(historyQuerySchema) as any, controller.getHistory);
router.get('/config', controller.getConfig);
router.patch('/config', validate(updateConfigSchema) as any, controller.updateConfig);
router.get('/amount-config', controller.getAmountConfig);
router.patch('/amount-config', validate(updateAmountConfigSchema) as any, controller.updateAmountConfig);

export default router;
