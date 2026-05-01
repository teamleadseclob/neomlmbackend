import { Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';
import multiLevelRewardService from './multilevel-rewards.service';
import { AuthRequest } from '../../types';

export const getHistory = catchAsync(async (req, res: Response) => {
  const result = await multiLevelRewardService.getHistory((req as AuthRequest).user._id, req.query as any);
  return ApiResponse.paginated(
    res,
    'Multi-level rewards history retrieved',
    result.history as any,
    result.pagination,
  );
});
