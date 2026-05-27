import { Router } from 'express';
import * as kycController from './kyc.controller';
import * as kycValidation from './kyc.validation';
import auth from '../../middlewares/auth';
import authorize from '../../middlewares/authorize';
import validate from '../../middlewares/validate';
import upload from '../../middlewares/upload';

const userRouter = Router();
const adminRouter = Router();

// ─── User Routes ───
userRouter.use(auth as any);

userRouter.post(
  '/upload',
  upload.single('file'),
  kycController.uploadDocument,
);

userRouter.post(
  '/submit',
  validate(kycValidation.submitKyc),
  kycController.submitKyc,
);

userRouter.get('/status', kycController.getStatus);

// ─── Admin Routes ───
adminRouter.use(auth as any, authorize('admin') as any);

adminRouter.get('/', kycController.adminList);
adminRouter.patch(
  '/:id/review',
  validate(kycValidation.reviewKyc),
  kycController.reviewKyc,
);

export { userRouter, adminRouter };
