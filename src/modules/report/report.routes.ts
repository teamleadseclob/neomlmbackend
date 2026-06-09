import { Router } from 'express';
import * as reportController from './report.controller';
import * as dataController from './report-data.controller';
import auth from '../../middlewares/auth';
import authorize from '../../middlewares/authorize';

const router = Router();

router.use(auth as any, authorize('admin') as any);

// Paginated JSON data endpoints
router.get('/data/transactions', dataController.getTransactions);
router.get('/data/layered-rewards', dataController.getLayeredRewards);
router.get('/data/rank-rewards', dataController.getRankRewards);
router.get('/data/swp-packages', dataController.getSwpPackages);
router.get('/data/trading-capital-profit', dataController.getTradingCapitalProfit);
router.get('/data/multilevel-rewards', dataController.getMultilevelRewards);
router.get('/data/royalty-rewards', dataController.getRoyaltyRewards);
router.get('/data/special-rewards', dataController.getSpecialRewards);
router.get('/data/pool-rewards', dataController.getPoolRewards);
router.get('/data/management-fund', dataController.getManagementFund);
router.get('/data/operation-fund', dataController.getOperationFund);
router.get('/data/all-members', dataController.getAllMembers);
router.get('/data/approved-withdrawals', dataController.getApprovedWithdrawals);

// PDF/Excel download endpoints
router.get('/:type', reportController.generateReport);

export default router;
