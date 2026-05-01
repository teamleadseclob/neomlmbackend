import { Router } from 'express';
import auth from '../../middlewares/auth';
import authorize from '../../middlewares/authorize';
import validate from '../../middlewares/validate';
import * as controller from './rank-bonus.controller';
import { distributeSchema, updateConfigSchema, historyQuerySchema } from './rank-bonus.validation';

const router = Router();

router.use(auth as any);
router.use(authorize('admin') as any);

router.post('/distribute', validate(distributeSchema) as any, controller.distribute);
router.get('/history', validate(historyQuerySchema) as any, controller.getHistory);
router.get('/config', controller.getConfig);
router.patch('/config', validate(updateConfigSchema) as any, controller.updateConfig);

export default router;
