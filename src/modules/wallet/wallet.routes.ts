import { Router } from 'express';
import * as walletController from './wallet.controller';
import auth from '../../middlewares/auth';
import authorize from '../../middlewares/authorize';
import validate from '../../middlewares/validate';
import * as walletValidation from './wallet.validation';

const router = Router();

router.use(auth as any, authorize('admin') as any);

router.post('/set-mnemonic', validate(walletValidation.setMnemonic), walletController.setMnemonic);
router.get('/status', walletController.getStatus);

export default router;
