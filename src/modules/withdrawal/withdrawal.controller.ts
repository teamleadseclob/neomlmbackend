import { Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';
import withdrawalService from './withdrawal.service';
import { AuthRequest } from '../../types';

// ─── User endpoints ───

export const requestWithdrawal = catchAsync(async (req, res: Response) => {
  const { walletAddress, amount } = req.body;
  const result = await withdrawalService.requestWithdrawal(
    (req as AuthRequest).user._id,
    walletAddress,
    amount,
  );
  return ApiResponse.created(res, 'Withdrawal request submitted. Pending admin approval.', result);
});

export const getHistory = catchAsync(async (req, res: Response) => {
  const result = await withdrawalService.getHistory((req as AuthRequest).user._id, req.query as any);
  return res.status(200).json({
    success: true,
    statusCode: 200,
    message: 'Withdrawal history retrieved',
    totalEarnings: result.totalEarnings,
    walletBalance: result.walletBalance,
    totalWithdrawnAmount: result.totalWithdrawnAmount,
    data: result.transactions,
    pagination: result.pagination,
  });
});

// ─── Admin endpoints ───

export const approveWithdrawal = catchAsync(async (req, res: Response) => {
  const result = await withdrawalService.approveWithdrawal(
    req.params.id as string,
    (req as AuthRequest).user._id,
  );
  return ApiResponse.success(res, 'Withdrawal approved and USDT sent', result);
});

export const rejectWithdrawal = catchAsync(async (req, res: Response) => {
  const result = await withdrawalService.rejectWithdrawal(
    req.params.id as string,
    (req as AuthRequest).user._id,
    req.body.reason,
  );
  return ApiResponse.success(res, 'Withdrawal rejected and balance refunded', result);
});

export const bulkApprove = catchAsync(async (req, res: Response) => {
  const result = await withdrawalService.bulkApprove((req as AuthRequest).user._id);
  return ApiResponse.success(res, 'Bulk approval completed', result);
});

export const adminListWithdrawals = catchAsync(async (req, res: Response) => {
  const result = await withdrawalService.adminListWithdrawals(req.query as any);
  return ApiResponse.paginated(
    res,
    'Withdrawals retrieved',
    result.transactions as any,
    result.pagination,
  );
});

export const retryWithdrawal = catchAsync(async (req, res: Response) => {
  const result = await withdrawalService.retryWithdrawal(
    req.params.id as string,
    (req as AuthRequest).user._id,
  );
  return ApiResponse.success(res, 'Withdrawal retried and USDT sent', result);
});

export const refundWithdrawal = catchAsync(async (req, res: Response) => {
  const result = await withdrawalService.refundWithdrawal(
    req.params.id as string,
    (req as AuthRequest).user._id,
  );
  return ApiResponse.success(res, 'Failed withdrawal refunded to user', result);
});
