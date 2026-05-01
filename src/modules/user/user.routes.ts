import { Router } from 'express';
import * as userController from './user.controller';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import * as userValidation from './user.validation';

const router = Router();

router.use(auth as any);

router.get('/dashboard', userController.getDashboard);
router.get('/me', userController.getProfile);
router.get('/me/income-chart', validate(userValidation.incomeChart), userController.getIncomeChart);
router.patch('/me', validate(userValidation.updateProfile), userController.updateProfile);
router.get('/referrals', userController.getDirectReferrals);
router.post('/send-referral', validate(userValidation.sendReferral), userController.sendReferral);
router.get('/list', validate(userValidation.getUsers), userController.getUsers);
router.get('/:userId', validate(userValidation.getUserById), userController.getUserById);

export default router;
