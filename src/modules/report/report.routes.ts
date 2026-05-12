import { Router } from 'express';
import * as reportController from './report.controller';
import auth from '../../middlewares/auth';
import authorize from '../../middlewares/authorize';

const router = Router();

router.use(auth as any, authorize('admin') as any);

router.get('/:type', reportController.generateReport);

export default router;
