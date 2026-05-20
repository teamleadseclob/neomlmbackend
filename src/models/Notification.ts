import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface INotification extends Document {
  _id: Types.ObjectId;
  title?: string;
  imageUrl: string;
  isEnabled: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    title: { type: String, trim: true, maxlength: 200, default: null },
    imageUrl: { type: String, required: [true, 'Image is required'], trim: true },
    isEnabled: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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

const Notification: Model<INotification> = mongoose.model<INotification>('Notification', notificationSchema);

export default Notification;
