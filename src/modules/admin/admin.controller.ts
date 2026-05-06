import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';
import adminService from './admin.service';
import roiService from '../roi/roi.service';

export const getDashboard = catchAsync(async (_req: Request, res: Response) => {
  const result = await adminService.getDashboard();
  return ApiResponse.success(res, 'Admin dashboard retrieved', result);
});

export const getUsers = catchAsync(async (req: Request, res: Response) => {
  const { users, pagination } = await adminService.getUsers(req.query);
  return ApiResponse.paginated(res, 'Users retrieved successfully', users, pagination);
});

export const blockUser = catchAsync(async (req: Request, res: Response) => {
  const user = await adminService.blockUser(req.params.id as string);
  return ApiResponse.success(res, 'User blocked successfully', user);
});

export const unblockUser = catchAsync(async (req: Request, res: Response) => {
  const user = await adminService.unblockUser(req.params.id as string);
  return ApiResponse.success(res, 'User unblocked successfully', user);
});

export const getNetworkStats = catchAsync(async (_req: Request, res: Response) => {
  const stats = await adminService.getNetworkStats();
  return ApiResponse.success(res, 'Network stats retrieved successfully', stats);
});

export const grantSwp = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.grantSwp(req.params.id as string, req.body.amount as number);
  return ApiResponse.created(res, 'SWP package granted successfully', result);
});

export const getRoiConfig = catchAsync(async (_req: Request, res: Response) => {
  const config = await adminService.getRoiConfig();
  return ApiResponse.success(res, 'ROI config retrieved successfully', config);
});

export const updateRoiConfig = catchAsync(async (req: Request, res: Response) => {
  const config = await adminService.updateRoiConfig(req.body.dailyRoiPercentage as number);
  return ApiResponse.success(res, 'ROI config updated successfully', config);
});

export const distributeRoi = catchAsync(async (_req: Request, res: Response) => {
  const result = await roiService.distributeAll();
  return ApiResponse.success(res, 'ROI distributed successfully', result);
});

// Multi-Level Reward Config
export const getMultiLevelRewardConfigs = catchAsync(async (_req: Request, res: Response) => {
  const configs = await adminService.getMultiLevelRewardConfigs();
  return ApiResponse.success(res, 'Multi-level reward configs retrieved', configs);
});

export const updateMultiLevelRewardConfig = catchAsync(async (req: Request, res: Response) => {
  const level = parseInt(req.params.level as string, 10);
  const config = await adminService.updateMultiLevelRewardConfig(level, req.body);
  return ApiResponse.success(res, `Level ${level} config updated successfully`, config);
});

export const getRevenueChart = catchAsync(async (req: Request, res: Response) => {
  const year = parseInt(req.query.year as string, 10) || new Date().getFullYear();
  const result = await adminService.getRevenueChart(year);
  return ApiResponse.success(res, 'Revenue chart retrieved', result);
});

// Level Commission Config (SWP purchase commissions)
export const getLevelCommissions = catchAsync(async (_req: Request, res: Response) => {
  const configs = await adminService.getLevelCommissions();
  return ApiResponse.success(res, 'Level commissions retrieved', configs);
});

export const updateLevelCommission = catchAsync(async (req: Request, res: Response) => {
  const level = parseInt(req.params.level as string, 10);
  const config = await adminService.updateLevelCommission(level, req.body);
  return ApiResponse.success(res, `Level ${level} commission updated successfully`, config);
});

// Transactions
export const getTransactions = catchAsync(async (req: Request, res: Response) => {
  const { transactions, pagination } = await adminService.getTransactions(req.query);
  return ApiResponse.paginated(res, 'Transactions retrieved successfully', transactions, pagination);
});
