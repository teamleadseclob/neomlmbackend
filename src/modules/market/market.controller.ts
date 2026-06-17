import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';
import marketService from './market.service';
import { AuthRequest } from '../../types';

export const expressInterest = catchAsync(async (req: Request, res: Response) => {
  const result = await marketService.expressInterest(
    (req as AuthRequest).user._id,
    req.body.marketTitle,
  );
  return ApiResponse.created(res, 'Interest recorded successfully', result);
});

export const getUserInterests = catchAsync(async (req: Request, res: Response) => {
  const result = await marketService.getUserInterests((req as AuthRequest).user._id);
  return ApiResponse.success(res, 'Market interests retrieved', result);
});

export const acceptInterest = catchAsync(async (req: Request, res: Response) => {
  const result = await marketService.acceptInterest(req.params.id as string, req.body.url);
  return ApiResponse.success(res, 'Market interest accepted', result);
});

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const result = await marketService.adminList(req.query as any);
  return ApiResponse.success(res, 'Market interests retrieved', result);
});

export const getUnreadCount = catchAsync(async (_req: Request, res: Response) => {
  const result = await marketService.getUnreadCount();
  return ApiResponse.success(res, 'Unread count retrieved', result);
});

export const markAllAsRead = catchAsync(async (_req: Request, res: Response) => {
  await marketService.markAllAsRead();
  return ApiResponse.success(res, 'All market interests marked as read');
});
