import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface IEvent extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  mediaData: Buffer;
  mediaType: string;
  mediaSize: number;
  expiresAt: Date;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const eventSchema = new Schema<IEvent>(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    mediaData: {
      type: Buffer,
      required: [true, 'Media file is required'],
    },
    mediaType: {
      type: String,
      required: true,
    },
    mediaSize: {
      type: Number,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.mediaData;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// TTL — auto-delete expired events
eventSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
eventSchema.index({ isActive: 1, expiresAt: 1 });

export const ALLOWED_MEDIA_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
];

export const MAX_MEDIA_SIZE = 5 * 1024 * 1024; // 5MB

const Event: Model<IEvent> = mongoose.model<IEvent>('Event', eventSchema);

export default Event;
