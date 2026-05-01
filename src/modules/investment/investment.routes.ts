import { Router } from 'express';
import * as investmentController from './investment.controller';
import auth from '../../middlewares/auth';
import validate from '../../middlewares/validate';
import * as investmentValidation from './investment.validation';

const router = Router();

router.use(auth as any);

router.post('/', validate(investmentValidation.invest), investmentController.invest);
router.get('/trading-capital', investmentController.getTradingCapitalStats);
router.get('/history', investmentController.getHistory);

export default router;
