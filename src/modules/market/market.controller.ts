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

export const adminList = catchAsync(async (req: Request, res: Response) => {
  const result = await marketService.adminList(req.query as any);
  return ApiResponse.success(res, 'Market interests retrieved', result);
});
