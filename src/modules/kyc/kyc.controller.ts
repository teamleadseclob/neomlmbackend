import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';
import kycService from './kyc.service';
import { AuthRequest } from '../../types';
import env from '../../config/env';

export const uploadDocument = catchAsync(async (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    throw ApiError.badRequest('file is required');
  }
  const url = `${env.baseUrl}/uploads/${file.filename}`;
  return ApiResponse.success(res, 'Document uploaded', { url });
});

export const submitKyc = catchAsync(async (req: Request, res: Response) => {
  const result = await kycService.submit((req as AuthRequest).user._id, req.body);
  return ApiResponse.created(res, 'KYC submitted successfully', result);
});

export const getStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await kycService.getStatus((req as AuthRequest).user._id);
  return ApiResponse.success(res, 'KYC status retrieved', result);
});

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const result = await kycService.adminList(req.query as any);
  return ApiResponse.success(res, 'KYC submissions retrieved', result);
});

export const reviewKyc = catchAsync(async (req: Request, res: Response) => {
  const result = await kycService.review(
    req.params.id as string,
    (req as AuthRequest).user._id,
    req.body,
  );
  return ApiResponse.success(res, `KYC ${req.body.status} successfully`, result);
});
