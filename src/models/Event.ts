import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export const EVENT_TYPES = ['contest', 'learning_package', 'tools'] as const;
export type EventType = typeof EVENT_TYPES[number];

export interface IEvent extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  type: EventType;
  mediaUrl: string;
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
    type: {
      type: String,
      enum: EVENT_TYPES,
      required: [true, 'Event type is required'],
      index: true,
    },
    mediaUrl: {
      type: String,
      required: [true, 'Media URL is required'],
      trim: true,
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
        delete ret.__v;
        return ret;
      },
    },
  },
);

eventSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
eventSchema.index({ isActive: 1, type: 1, expiresAt: 1 });

const Event: Model<IEvent> = mongoose.model<IEvent>('Event', eventSchema);

export default Event;
