import { Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';
import roiService from './roi.service';
import { AuthRequest } from '../../types';

export const getRoiStatus = catchAsync(async (req, res: Response) => {
  const result = await roiService.getUserRoiStatus((req as AuthRequest).user._id);
  return ApiResponse.success(res, 'ROI status retrieved', result);
});

export const getRoiHistory = catchAsync(async (req, res: Response) => {
  const result = await roiService.getUserRoiHistory((req as AuthRequest).user._id, req.query as any);
  return ApiResponse.paginated(
    res,
    'ROI history retrieved',
    result.history as any,
    result.pagination,
  );
});

export const getCombinedHistory = catchAsync(async (req, res: Response) => {
  const result = await roiService.getCombinedHistory((req as AuthRequest).user._id, req.query as any);
  return ApiResponse.paginated(
    res,
    'Combined ROI & MLR history retrieved',
    result.history as any,
    result.pagination,
  );
});
