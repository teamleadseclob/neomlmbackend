import { Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';
import swpService from './swp.service';
import { AuthRequest } from '../../types';

export const purchase = catchAsync(async (req, res: Response) => {
  const result = await swpService.purchase((req as AuthRequest).user._id, req.body.amount);
  return ApiResponse.created(res, 'SWP purchased successfully', result);
});

export const getStatus = catchAsync(async (req, res: Response) => {
  const result = await swpService.getUserSwpStatus((req as AuthRequest).user._id);
  return ApiResponse.success(res, 'SWP status retrieved', result);
});

export const getPurchaseHistory = catchAsync(async (req, res: Response) => {
  const result = await swpService.getPurchaseHistory((req as AuthRequest).user._id);
  return ApiResponse.success(res, 'Purchase history retrieved', result);
});

export const getCommissionHistory = catchAsync(async (req, res: Response) => {
  const result = await swpService.getCommissionHistory((req as AuthRequest).user._id, req.query as any);
  return ApiResponse.paginated(
    res,
    'Commission history retrieved',
    result.history as any,
    result.pagination,
  );
});

export const getPackages = catchAsync(async (req, res: Response) => {
  const result = await swpService.getPackages((req as AuthRequest).user._id);
  return ApiResponse.success(res, 'SWP packages retrieved', result);
});

export const getTeamStats = catchAsync(async (req, res: Response) => {
  const result = await swpService.getTeamStats((req as AuthRequest).user._id);
  return ApiResponse.success(res, 'Team stats retrieved', result);
});
