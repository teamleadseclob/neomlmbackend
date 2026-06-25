import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';
import adminService from './admin.service';
import roiService from '../roi/roi.service';
import { AuthRequest } from '../../types';

export const getDashboard = catchAsync(async (_req: Request, res: Response) => {
  const result = await adminService.getDashboard();
  return ApiResponse.success(res, 'Admin dashboard retrieved', result);
});

export const getUsers = catchAsync(async (req: Request, res: Response) => {
  const { users, pagination } = await adminService.getUsers(req.query);
  return ApiResponse.paginated(res, 'Users retrieved successfully', users, pagination);
});

export const getUserById = catchAsync(async (req: Request, res: Response) => {
  const user = await adminService.getUserById(req.params.id as string);
  return ApiResponse.success(res, 'User retrieved successfully', user);
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

export const distributeRoi = catchAsync(async (req: Request, res: Response) => {
  const result = await roiService.distributeAll((req as AuthRequest).user._id);
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

// Upload File
export const uploadFile = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(400, 'No file uploaded');
  }
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  return ApiResponse.success(res, 'File uploaded successfully', { url: fileUrl });
});

export const uploadMultipleFiles = catchAsync(async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    throw new ApiError(400, 'No files uploaded');
  }
  const urls = files.map(f => `${req.protocol}://${req.get('host')}/uploads/${f.filename}`);
  return ApiResponse.success(res, 'Files uploaded successfully', { urls });
});

// Change User Password
export const changeUserPassword = catchAsync(async (req: Request, res: Response) => {
  await adminService.changeUserPassword(req.params.id as string, req.body.newPassword as string);
  return ApiResponse.success(res, 'User password changed successfully');
});

// Change User Email
export const changeUserEmail = catchAsync(async (req: Request, res: Response) => {
  const user = await adminService.changeUserEmail(req.params.id as string, req.body.newEmail as string);
  return ApiResponse.success(res, 'User email changed successfully', user);
});

// 2FA
export const adminDisable2FA = catchAsync(async (req: Request, res: Response) => {
  await adminService.adminDisable2FA(req.params.id as string);
  return ApiResponse.success(res, '2FA disabled for user successfully');
});

// User Join Chart
export const getUserJoinChart = catchAsync(async (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string, 10) || 30;
  const result = await adminService.getUserJoinChart(days);
  return ApiResponse.success(res, 'User join chart retrieved', result);
});

// ROI Distribution History
export const getRoiDistributionHistory = catchAsync(async (req: Request, res: Response) => {
  const { distributions, pagination } = await adminService.getRoiDistributionHistory(req.query as any);
  return ApiResponse.paginated(res, 'ROI distribution history retrieved', distributions, pagination);
});

// Pool Config
export const getPoolConfig = catchAsync(async (_req: Request, res: Response) => {
  const config = await adminService.getPoolConfig();
  return ApiResponse.success(res, 'Pool config retrieved successfully', config);
});

export const updatePoolConfig = catchAsync(async (req: Request, res: Response) => {
  const config = await adminService.updatePoolConfig(req.body.percentage as number);
  return ApiResponse.success(res, 'Pool config updated successfully', config);
});

export const previewPoolDistribution = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.previewPoolDistribution(req.query.percentage ? parseFloat(req.query.percentage as string) : 0);
  return ApiResponse.success(res, 'Pool distribution preview', result);
});

// Distribute Pool Fund
export const distributePoolFund = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.distributePoolFund((req as AuthRequest).user._id);
  return ApiResponse.success(res, 'Pool fund distributed successfully', result);
});

// Add USDT to user wallet
export const addUsdtToWallet = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.addUsdtToWallet(req.params.id as string, req.body.amount as number, (req as AuthRequest).user._id);
  return ApiResponse.success(res, 'USDT added to wallet successfully', result);
});

export const addFundToUser = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.addFundToUser(req.params.id as string, req.body.field as string, req.body.amount as number);
  return ApiResponse.success(res, 'Fund added successfully', result);
});

// Recent SWP Purchases
export const getRecentSwpPurchases = catchAsync(async (_req: Request, res: Response) => {
  const result = await adminService.getRecentSwpPurchases();
  return ApiResponse.success(res, 'Recent SWP purchases retrieved', result);
});
