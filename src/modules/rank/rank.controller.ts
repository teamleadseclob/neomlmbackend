import { Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';
import rankService from './rank.service';
import { AuthRequest } from '../../types';

export const getRankStatus = catchAsync(async (req, res: Response) => {
  const result = await rankService.getRankStatus((req as AuthRequest).user._id);
  return ApiResponse.success(res, 'Rank status retrieved', result);
});

export const getRewardHistory = catchAsync(async (req, res: Response) => {
  const result = await rankService.getRewardHistory((req as AuthRequest).user._id);
  return ApiResponse.success(res, 'Rank rewards history retrieved', result);
});
