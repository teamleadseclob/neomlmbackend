import { Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';
import rankBonusService from './rank-bonus.service';
import { AuthRequest } from '../../types';

export const distribute = catchAsync(async (req, res: Response) => {
  const result = await rankBonusService.distribute((req as AuthRequest).user._id);
  return ApiResponse.success(res, 'Rank bonus distributed successfully', result);
});

export const getHistory = catchAsync(async (req, res: Response) => {
  const { page = 1, limit = 10 } = req.query;
  const result = await rankBonusService.getHistory(Number(page), Number(limit));
  return ApiResponse.paginated(res, 'Rank bonus history retrieved', result.docs, result.pagination);
});

export const getConfig = catchAsync(async (_req, res: Response) => {
  const configs = await rankBonusService.getConfig();
  return ApiResponse.success(res, 'Rank bonus config retrieved', configs);
});

export const updateConfig = catchAsync(async (req, res: Response) => {
  const { rankOrder, percentage } = req.body;
  const config = await rankBonusService.updateConfig(rankOrder, percentage);
  return ApiResponse.success(res, 'Rank bonus config updated', config);
});

export const getAmountConfig = catchAsync(async (_req, res: Response) => {
  const config = await rankBonusService.getAmountConfig();
  return ApiResponse.success(res, 'Rank bonus amount config retrieved', config);
});

export const updateAmountConfig = catchAsync(async (req, res: Response) => {
  const config = await rankBonusService.updateAmountConfig(req.body.amount);
  return ApiResponse.success(res, 'Rank bonus amount config updated', config);
});
