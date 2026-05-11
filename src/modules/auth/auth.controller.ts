import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';
import authService from './auth.service';
import { AuthRequest } from '../../types';

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

// 2FA
export const generate2FA = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.generate2FA((req as AuthRequest).user._id);
  return ApiResponse.success(res, '2FA QR code generated. Scan with Google Authenticator.', result);
});

export const enable2FA = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.enable2FA((req as AuthRequest).user._id, req.body.totpCode);
  return ApiResponse.success(res, result.message);
});

export const disable2FA = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.disable2FA((req as AuthRequest).user._id, req.body.password, req.body.totpCode);
  return ApiResponse.success(res, result.message);
});

export const get2FAStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.get2FAStatus((req as AuthRequest).user._id);
  return ApiResponse.success(res, '2FA status retrieved', result);
});
