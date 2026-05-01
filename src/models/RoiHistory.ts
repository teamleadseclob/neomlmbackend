import mongoose, { Schema, Model } from 'mongoose';
import { IRoiHistory } from '../types';

const roiHistorySchema = new Schema<IRoiHistory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    roiConfigId: {
      type: Schema.Types.ObjectId,
      ref: 'RoiConfig',
      required: true,
    },
    totalInvestedAmount: {
      type: Number,
      required: true,
    },
    roiPercentage: {
      type: Number,
      required: true,
    },
    daysCalculated: {
      type: Number,
      required: true,
    },
    roiEarned: {
      type: Number,
      required: true,
    },
    roiCapped: {
      type: Boolean,
      default: false,
    },
    capApplied: {
      type: Number,
      default: 0,
    },
    totalRoiBefore: {
      type: Number,
      required: true,
    },
    totalRoiAfter: {
      type: Number,
      required: true,
    },
    distributionBatchId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

roiHistorySchema.index({ userId: 1, createdAt: -1 });
roiHistorySchema.index({ distributionBatchId: 1 });

const RoiHistory: Model<IRoiHistory> = mongoose.model<IRoiHistory>('RoiHistory', roiHistorySchema);

export default RoiHistory;
