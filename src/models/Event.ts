import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export const EVENT_TYPES = ['contest', 'learning_package', 'tools'] as const;
export type EventType = typeof EVENT_TYPES[number];

export const CATEGORIES = [
  'cryptocurrency_basics',
  'advanced_trading',
  'network_marketing',
  'financial_literacy',
] as const;

export const ACCESS_LEVELS = ['all_members', 'vip_members_only', 'premium_members'] as const;
export const STATUS_OPTIONS = ['active', 'inactive', 'maintenance'] as const;

export interface IEvent extends Document {
  _id: Types.ObjectId;
  type: EventType;
  imageUrls: string[];
  mediaUrl?: string;
  pdfUrls: string[];
  googleMapsLink?: string;
  description: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  // Contest fields
  title?: string;
  subTitle?: string;
  startDate?: Date;
  endDate?: Date;

  // Learning Package fields
  packageName?: string;
  category?: string;
  price?: number;
  duration?: string;
  accessLevel?: string;
  status?: string;

  // Tools fields
  toolName?: string;
  toolType?: string;
}

const eventSchema = new Schema<IEvent>(
  {
    type: {
      type: String,
      enum: EVENT_TYPES,
      required: [true, 'Event type is required'],
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    imageUrls: { type: [String], default: [] },
    mediaUrl: { type: String, trim: true, default: null },
    pdfUrls: { type: [String], default: [] },
    googleMapsLink: { type: String, trim: true, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // Contest
    title: { type: String, trim: true, maxlength: 200 },
    subTitle: { type: String, trim: true, maxlength: 300 },
    startDate: { type: Date },
    endDate: { type: Date },

    // Learning Package
    packageName: { type: String, trim: true, maxlength: 200 },
    category: { type: String, enum: CATEGORIES },
    price: { type: Number, min: 0 },
    duration: { type: String, trim: true },
    accessLevel: { type: String, enum: ACCESS_LEVELS },
    status: { type: String, enum: STATUS_OPTIONS, default: 'active' },

    // Tools
    toolName: { type: String, trim: true, maxlength: 200 },
    toolType: { type: String, trim: true, maxlength: 100 },
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

eventSchema.index({ type: 1, status: 1 });

const Event: Model<IEvent> = mongoose.model<IEvent>('Event', eventSchema);

export default Event;
