import { Router } from 'express';
import * as authController from './auth.controller';
import validate from '../../middlewares/validate';
import * as authValidation from './auth.validation';
import auth from '../../middlewares/auth';

const router = Router();

router.post('/register', validate(authValidation.register), authController.register);
router.post('/verify-otp', validate(authValidation.verifyOtp), authController.verifyOtp);
router.post('/resend-otp', validate(authValidation.resendOtp), authController.resendOtp);
router.post('/login', validate(authValidation.login), authController.login);

// 2FA (requires auth)
router.post('/2fa/generate', auth as any, authController.generate2FA);
router.post('/2fa/enable', auth as any, validate(authValidation.enable2FA), authController.enable2FA);
router.post('/2fa/disable', auth as any, validate(authValidation.disable2FA), authController.disable2FA);
router.get('/2fa/status', auth as any, authController.get2FAStatus);

export default router;
