import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';
import UserNotification from '../../models/UserNotification';
import { AuthRequest } from '../../types';

export const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user._id;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const skip = (page - 1) * limit;

  const [notifications, totalDocs] = await Promise.all([
    UserNotification.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    UserNotification.countDocuments({ userId }),
  ]);

  return ApiResponse.paginated(res, 'Notifications retrieved', notifications, {
    page, limit, totalDocs, totalPages: Math.ceil(totalDocs / limit), skip,
  });
});

export const getUnreadCount = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user._id;
  const count = await UserNotification.countDocuments({ userId, isRead: false });
  return ApiResponse.success(res, 'Unread count retrieved', { unreadCount: count });
});

export const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user._id;
  const { id } = req.params;
  await UserNotification.findOneAndUpdate({ _id: id, userId }, { isRead: true });
  return ApiResponse.success(res, 'Notification marked as read');
});

export const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user._id;
  await UserNotification.updateMany({ userId, isRead: false }, { isRead: true });
  return ApiResponse.success(res, 'All notifications marked as read');
});
