import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export const NOTIFICATION_TYPES = [
  'referral_income',
  'layered_rewards',
  'rank_income',
  'royalty_rewards',
  'special_rewards',
] as const;

export type NotificationType = typeof NOTIFICATION_TYPES[number];

export interface IUserNotification extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: NotificationType;
  message: string;
  amount: number;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userNotificationSchema = new Schema<IUserNotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    message: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    isRead: { type: Boolean, default: false },
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

userNotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

const UserNotification: Model<IUserNotification> = mongoose.model<IUserNotification>('UserNotification', userNotificationSchema);

export default UserNotification;
