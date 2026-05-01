import mongoose, { Schema, Model } from 'mongoose';
import { INetwork } from '../types';

const networkSchema = new Schema<INetwork>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    level: {
      type: Number,
      default: 0,
      min: 0,
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

const Network: Model<INetwork> = mongoose.model<INetwork>('Network', networkSchema);

export default Network;