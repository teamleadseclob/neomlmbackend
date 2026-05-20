import { Types } from 'mongoose';
import Notification from '../../models/Notification';
import ApiError from '../../utils/ApiError';

class NotificationService {
  async create(data: { title?: string; imageUrl: string; createdBy: Types.ObjectId }) {
    return Notification.create(data);
  }

  async getAll() {
    return Notification.find().sort({ createdAt: -1 }).lean();
  }

  async getEnabled() {
    return Notification.find({ isEnabled: true }).sort({ createdAt: -1 }).lean();
  }

  async toggleEnable(id: string, isEnabled: boolean) {
    const notification = await Notification.findByIdAndUpdate(id, { isEnabled }, { new: true });
    if (!notification) throw ApiError.notFound('Notification not found');
    return notification;
  }

  async delete(id: string) {
    const notification = await Notification.findByIdAndDelete(id);
    if (!notification) throw ApiError.notFound('Notification not found');
  }
}

export default new NotificationService();
