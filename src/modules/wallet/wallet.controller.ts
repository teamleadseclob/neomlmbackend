import { Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';
import walletService from './wallet.service';

export const setMnemonic = catchAsync(async (req, res: Response) => {
  const result = await walletService.setMnemonic(req.body.mnemonic);
  return ApiResponse.success(res, result.message);
});

export const getStatus = catchAsync(async (_req, res: Response) => {
  const result = await walletService.getStatus();
  return ApiResponse.success(res, 'Wallet status retrieved', result);
});
