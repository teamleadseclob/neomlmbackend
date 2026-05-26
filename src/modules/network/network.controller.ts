import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';
import networkService from './network.service';
import { AuthRequest } from '../../types';

export const getDownline = catchAsync(async (req: Request, res: Response) => {
  const tree = await networkService.getDownline(req.params.userId as string);
  return ApiResponse.success(res, 'Downline tree retrieved successfully', tree);
});

export const getUserNetworkStats = catchAsync(async (req: Request, res: Response) => {
  const stats = await networkService.getUserNetworkStats(req.params.userId as string);
  return ApiResponse.success(res, 'Network stats retrieved successfully', stats);
});

export const getNetworkStats = catchAsync(async (_req: Request, res: Response) => {
  const stats = await networkService.getNetworkStats();
  return ApiResponse.success(res, 'Overall network stats retrieved successfully', stats);
});

export const getTeamMemberDetails = catchAsync(async (req: Request, res: Response) => {
  const result = await networkService.getTeamMemberDetails(
    (req as AuthRequest).user._id,
    req.params.userId as string,
  );
  return ApiResponse.success(res, 'Team member details retrieved', result);
});
