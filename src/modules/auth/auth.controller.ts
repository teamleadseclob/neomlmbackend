import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';
import authService from './auth.service';

export const register = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.register(req.body);
  return ApiResponse.success(res, result.message, { email: result.email });
});

export const verifyOtp = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.verifyOtp(req.body.email, req.body.otp);
  return ApiResponse.created(res, 'Email verified. Registration successful.', result);
});

export const resendOtp = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.resendOtp(req.body.email);
  return ApiResponse.success(res, result.message, { email: result.email });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  return ApiResponse.success(res, 'Login successful', result);
});
