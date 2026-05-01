import { Types } from 'mongoose';
import ApiError from '../../utils/ApiError';
import Event from '../../models/Event';

interface EventResponse {
  _id: Types.ObjectId;
  title: string;
  description: string;
  mediaUrl: string;
  mediaType: string;
  mediaSize: number;
  expiresAt: Date;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  isExpired?: boolean;
}

class EventService {
  async create(data: {
    title: string;
    description: string;
    expiryDays: number;
    mediaBuffer: Buffer;
    mediaType: string;
    mediaSize: number;
    createdBy: Types.ObjectId;
  }) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + data.expiryDays);

    return Event.create({
      title: data.title,
      description: data.description,
      mediaData: data.mediaBuffer,
      mediaType: data.mediaType,
      mediaSize: data.mediaSize,
      expiresAt,
      createdBy: data.createdBy,
    });
  }

  async getActiveEvents(): Promise<EventResponse[]> {
    const events = await Event.find({
      isActive: true,
      expiresAt: { $gt: new Date() },
    })
      .select('-mediaData')
      .sort({ createdAt: -1 })
      .lean();

    return events.map((e) => ({
      _id: e._id as Types.ObjectId,
      title: e.title,
      description: e.description,
      mediaUrl: `/api/events/${e._id}/media`,
      mediaType: e.mediaType,
      mediaSize: e.mediaSize,
      expiresAt: e.expiresAt,
      isActive: e.isActive,
      createdBy: e.createdBy,
      createdAt: e.createdAt,
    }));
  }

  async getAllEvents(): Promise<EventResponse[]> {
    const events = await Event.find()
      .select('-mediaData')
      .sort({ createdAt: -1 })
      .lean();

    return events.map((e) => ({
      _id: e._id as Types.ObjectId,
      title: e.title,
      description: e.description,
      mediaUrl: `/api/events/${e._id}/media`,
      mediaType: e.mediaType,
      mediaSize: e.mediaSize,
      expiresAt: e.expiresAt,
      isActive: e.isActive,
      createdBy: e.createdBy,
      createdAt: e.createdAt,
      isExpired: new Date() > e.expiresAt,
    }));
  }

  async getEventById(id: string): Promise<EventResponse> {
    const e = await Event.findById(id).select('-mediaData').lean();
    if (!e) throw ApiError.notFound('Event not found');

    return {
      _id: e._id as Types.ObjectId,
      title: e.title,
      description: e.description,
      mediaUrl: `/api/events/${e._id}/media`,
      mediaType: e.mediaType,
      mediaSize: e.mediaSize,
      expiresAt: e.expiresAt,
      isActive: e.isActive,
      createdBy: e.createdBy,
      createdAt: e.createdAt,
    };
  }

  async getEventMedia(id: string): Promise<{ data: Buffer; type: string }> {
    const event = await Event.findById(id).select('mediaData mediaType');
    if (!event) throw ApiError.notFound('Event not found');

    return {
      data: event.mediaData,
      type: event.mediaType,
    };
  }

  async update(id: string, data: { title?: string; description?: string; expiryDays?: number }) {
    const event = await Event.findById(id);
    if (!event) throw ApiError.notFound('Event not found');

    if (data.title) event.title = data.title;
    if (data.description) event.description = data.description;
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
