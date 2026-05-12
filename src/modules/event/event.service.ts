import { Types } from 'mongoose';
import ApiError from '../../utils/ApiError';
import Event, { EventType } from '../../models/Event';

class EventService {
  async create(data: {
    title: string;
    description: string;
    type: EventType;
    mediaUrl: string;
    expiryDays: number;
    createdBy: Types.ObjectId;
  }) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + data.expiryDays);

    return Event.create({
      title: data.title,
      description: data.description,
      type: data.type,
      mediaUrl: data.mediaUrl,
      expiresAt,
      createdBy: data.createdBy,
    });
  }

  async getActiveEvents(type?: string): Promise<any[]> {
    const filter: Record<string, unknown> = {
      isActive: true,
      expiresAt: { $gt: new Date() },
    };
    if (type) filter.type = type;

    return Event.find(filter).sort({ createdAt: -1 }).lean();
  }

  async getAllEvents(type?: string): Promise<any[]> {
    const filter: Record<string, unknown> = {};
    if (type) filter.type = type;

    const events = await Event.find(filter).sort({ createdAt: -1 }).lean();
    return events.map((e) => ({
      ...e,
      isExpired: new Date() > e.expiresAt,
    }));
  }

  async getEventById(id: string) {
    const event = await Event.findById(id).lean();
    if (!event) throw ApiError.notFound('Event not found');
    return event;
  }

  async update(id: string, data: { title?: string; description?: string; mediaUrl?: string; expiryDays?: number }) {
    const event = await Event.findById(id);
    if (!event) throw ApiError.notFound('Event not found');

    if (data.title) event.title = data.title;
    if (data.description) event.description = data.description;
    if (data.mediaUrl) event.mediaUrl = data.mediaUrl;
    if (data.expiryDays) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + data.expiryDays);
      event.expiresAt = expiresAt;
    }

    await event.save();
    return event;
  }

  async delete(id: string): Promise<void> {
    const event = await Event.findByIdAndDelete(id);
    if (!event) throw ApiError.notFound('Event not found');
  }
}

export default new EventService();
