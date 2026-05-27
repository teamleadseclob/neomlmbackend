import { Router } from 'express';
import * as marketController from './market.controller';
import * as marketValidation from './market.validation';
import auth from '../../middlewares/auth';
import authorize from '../../middlewares/authorize';
import validate from '../../middlewares/validate';

const userRouter = Router();
const adminRouter = Router();

// ─── User Route ───
userRouter.use(auth as any);
userRouter.post('/interest', validate(marketValidation.expressInterest), marketController.expressInterest);

// ─── Admin Route ───
adminRouter.use(auth as any, authorize('admin') as any);
adminRouter.get('/interests', validate(marketValidation.adminList), marketController.adminList);

export { userRouter, adminRouter };
