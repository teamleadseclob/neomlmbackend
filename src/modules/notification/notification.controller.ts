import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';
import ApiError from '../../utils/ApiError';
import notificationService from './notification.service';
import { AuthRequest } from '../../types';

export const createNotification = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) throw new ApiError(400, 'Image is required');

  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  const result = await notificationService.create({
    title: req.body.title,
    imageUrl,
    createdBy: (req as AuthRequest).user._id,
  });
  return ApiResponse.created(res, 'Notification created successfully', result);
});

export const getAllNotifications = catchAsync(async (_req: Request, res: Response) => {
  const notifications = await notificationService.getAll();
  return ApiResponse.success(res, 'Notifications retrieved', notifications);
});

export const getEnabledNotifications = catchAsync(async (_req: Request, res: Response) => {
  const notifications = await notificationService.getEnabled();
  return ApiResponse.success(res, 'Notifications retrieved', notifications);
});

export const toggleNotification = catchAsync(async (req: Request, res: Response) => {
  const { isEnabled } = req.body;
  const result = await notificationService.toggleEnable(req.params.id as string, isEnabled);
  const msg = isEnabled ? 'Notification enabled' : 'Notification disabled';
  return ApiResponse.success(res, msg, result);
});

export const deleteNotification = catchAsync(async (req: Request, res: Response) => {
  await notificationService.delete(req.params.id as string);
  return ApiResponse.success(res, 'Notification deleted successfully');
});
