import { Router } from 'express';
import * as authController from './auth.controller';
import validate from '../../middlewares/validate';
import * as authValidation from './auth.validation';

const router = Router();

router.post('/register', validate(authValidation.register), authController.register);
router.post('/verify-otp', validate(authValidation.verifyOtp), authController.verifyOtp);
router.post('/resend-otp', validate(authValidation.resendOtp), authController.resendOtp);
router.post('/login', validate(authValidation.login), authController.login);

export default router;
