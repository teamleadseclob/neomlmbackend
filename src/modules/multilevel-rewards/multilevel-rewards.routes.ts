import { Router } from 'express';
import * as mlrController from './multilevel-rewards.controller';
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

router.get('/history', validate(paginationQuery), mlrController.getHistory);

export default router;
