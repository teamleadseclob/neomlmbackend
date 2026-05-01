import { Router } from 'express';
import * as roiController from './roi.controller';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import Joi from 'joi';

const paginationQuery = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

const router = Router();

router.use(auth as any);

router.get('/status', roiController.getRoiStatus);
router.get('/history', validate(paginationQuery), roiController.getRoiHistory);
router.get('/combined-history', validate(paginationQuery), roiController.getCombinedHistory);

export default router;
