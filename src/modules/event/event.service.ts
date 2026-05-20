import { Types } from 'mongoose';
import ApiError from '../../utils/ApiError';
import Event from '../../models/Event';

class EventService {
  async create(data: Record<string, any> & { createdBy: Types.ObjectId }) {
    return Event.create(data);
  }

  async getActiveEvents(type?: string) {
    const filter: Record<string, unknown> = {};
    if (type) filter.type = type;

    // For contest: only show if endDate hasn't passed
    // For learning_package/tools: only show if status is active
    const now = new Date();
    const orConditions = [
      { type: 'contest', endDate: { $gt: now } },
      { type: { $in: ['learning_package', 'tools'] }, status: 'active' },
    ];

    if (type === 'contest') {
      filter.endDate = { $gt: now };
    } else if (type === 'learning_package' || type === 'tools') {
      filter.status = 'active';
    } else {
      filter.$or = orConditions;
    }

    return Event.find(filter).sort({ createdAt: -1 }).lean();
  }

  async getAllEvents(type?: string) {
    const filter: Record<string, unknown> = {};
    if (type) filter.type = type;
    return Event.find(filter).sort({ createdAt: -1 }).lean();
  }

  async getEventById(id: string) {
    const event = await Event.findById(id).lean();
    if (!event) throw ApiError.notFound('Event not found');
    return event;
  }

  async update(id: string, data: Record<string, any>) {
    const event = await Event.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!event) throw ApiError.notFound('Event not found');
    return event;
  }

  async delete(id: string): Promise<void> {
    const event = await Event.findByIdAndDelete(id);
    if (!event) throw ApiError.notFound('Event not found');
  }
}

export default new EventService();
