import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import ApiError from '../../utils/ApiError';
import reportService from './report.service';

const VALID_FORMATS = ['pdf', 'excel'];
const REPORT_TYPES: Record<string, (res: Response, query: any) => Promise<void>> = {
  transactions: (res, query) => reportService.generateTransactions(res, query),
  'layered-rewards': (res, query) => reportService.generateLayeredRewards(res, query),
  'rank-rewards': (res, query) => reportService.generateRankRewards(res, query),
  'swp-packages': (res, query) => reportService.generateSwpPackages(res, query),
  'trading-capital-profit': (res, query) => reportService.generateTradingCapitalProfit(res, query),
  'multilevel-rewards': (res, query) => reportService.generateMultilevelRewards(res, query),
  'royalty-rewards': (res, query) => reportService.generateRoyaltyRewards(res, query),
  'special-rewards': (res, query) => reportService.generateSpecialRewards(res, query),
  'pool-rewards': (res, query) => reportService.generatePoolRewards(res, query),
  'management-fund': (res, query) => reportService.generateManagementFund(res, query),
  'operation-fund': (res, query) => reportService.generateOperationFund(res, query),
  'all-members': (res, query) => reportService.generateAllMembers(res, query),
  'approved-withdrawals': (res, query) => reportService.generateApprovedWithdrawals(res, query),
};

export const generateReport = catchAsync(async (req: Request, res: Response) => {
  const type = req.params.type as string;
  const { format, fromDate, toDate } = req.query;

  if (!format || !VALID_FORMATS.includes(format as string)) {
    throw ApiError.badRequest('Format must be "pdf" or "excel"');
  }

  const generator = REPORT_TYPES[type];
  if (!generator) {
    throw ApiError.badRequest(`Invalid report type: ${type}. Valid: ${Object.keys(REPORT_TYPES).join(', ')}`);
  }

  await generator(res, { format, fromDate, toDate });
});
