import { Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';
import investmentService from './investment.service';
import { AuthRequest } from '../../types';

export const invest = catchAsync(async (req, res: Response) => {
  const { amount, paymentMethod, walletAddress, transactionHash } = req.body;
  const result = await investmentService.invest((req as AuthRequest).user._id, {
    amount,
    paymentMethod,
    walletAddress,
    transactionHash,
  });
  return ApiResponse.created(res, 'Investment successful', result);
});

export const getTradingCapitalStats = catchAsync(async (req, res: Response) => {
  const result = await investmentService.getTradingCapitalStats((req as AuthRequest).user._id);
  return ApiResponse.success(res, 'Trading capital stats retrieved', result);
});

export const getHistory = catchAsync(async (req, res: Response) => {
  const result = await investmentService.getHistory((req as AuthRequest).user._id);
  return ApiResponse.success(res, 'Investment history retrieved', result);
});
