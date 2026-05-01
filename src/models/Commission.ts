import mongoose, { Schema, Model } from 'mongoose';
import { ICommission } from '../types';

const commissionSchema = new Schema<ICommission>(
  {
    earnerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fromUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    swpPurchaseId: {
      type: Schema.Types.ObjectId,
      ref: 'SwpPurchase',
      required: true,
      index: true,
    },
    level: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    type: {
      type: String,
      enum: ['referral', 'level'],
      required: true,
    },
    percentage: {
      type: Number,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    grossAmount: {
      type: Number,
      required: true,
    },
    cutoffAmount: {
      type: Number,
      required: true,
    },
    netAmount: {
      type: Number,
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

commissionSchema.index({ earnerId: 1, createdAt: -1 });
commissionSchema.index({ fromUserId: 1, createdAt: -1 });

const Commission: Model<ICommission> = mongoose.model<ICommission>('Commission', commissionSchema);

export default Commission;
