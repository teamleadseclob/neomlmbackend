import { Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';
import userService from './user.service';
import { AuthRequest } from '../../types';

export const getDashboard = catchAsync(async (req, res: Response) => {
  const result = await userService.getDashboard((req as AuthRequest).user._id);
  return ApiResponse.success(res, 'Dashboard retrieved', result);
});

export const getEarningLimits = catchAsync(async (req, res: Response) => {
  const result = await userService.getEarningLimits((req as AuthRequest).user._id);
  return ApiResponse.success(res, 'Earning limits retrieved', result);
});

export const getProfile = catchAsync(async (req, res: Response) => {
  const user = await userService.getProfile((req as AuthRequest).user._id);
  return ApiResponse.success(res, 'Profile retrieved successfully', user);
});

export const updateProfile = catchAsync(async (req, res: Response) => {
  const user = await userService.updateProfile((req as AuthRequest).user._id, req.body);
  return ApiResponse.success(res, 'Profile updated successfully', user);
});

export const uploadAvatar = catchAsync(async (req, res: Response) => {
  if (!req.file) {
    throw new ApiError(400, 'No file uploaded');
  }
  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  await userService.updateProfile((req as AuthRequest).user._id, { profileImage: url });
  return ApiResponse.success(res, 'Profile image uploaded successfully', { url });
});

export const getUserById = catchAsync(async (req, res: Response) => {
  const user = await userService.getUserByUserId(req.params.userId as string);
  return ApiResponse.success(res, 'User retrieved successfully', user);
});

export const getDirectReferrals = catchAsync(async (req, res: Response) => {
  const result = await userService.getDirectReferrals((req as AuthRequest).user._id);
  return ApiResponse.success(res, 'Direct referrals retrieved', result);
});

export const getUsers = catchAsync(async (req, res: Response) => {
  const { users, pagination } = await userService.getUsers(req.query);
  return ApiResponse.paginated(res, 'Users retrieved successfully', users, pagination);
});

export const getIncomeChart = catchAsync(async (req, res: Response) => {
  const result = await userService.getIncomeChart((req as AuthRequest).user._id, req.query as any);
  return ApiResponse.success(res, 'Monthly revenue retrieved', result);
});

export const sendReferral = catchAsync(async (req, res: Response) => {
  const result = await userService.sendReferralInvite((req as AuthRequest).user._id, req.body.email, req.body.referralLink);
  return ApiResponse.success(res, result.message, { email: result.email });
});
