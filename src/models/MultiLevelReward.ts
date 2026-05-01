import mongoose, { Schema, Model } from 'mongoose';
import { IMultiLevelReward } from '../types';

const multiLevelRewardSchema = new Schema<IMultiLevelReward>(
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
    roiHistoryId: {
      type: Schema.Types.ObjectId,
      ref: 'RoiHistory',
      required: true,
    },
    level: {
      type: Number,
      required: true,
      min: 1,
      max: 20,
    },
    percentage: {
      type: Number,
      required: true,
    },
    roiAmount: {
      type: Number,
      required: true,
    },
    rewardAmount: {
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
    requiredRankOrder: {
      type: Number,
      required: true,
    },
    earnerRankOrder: {
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

multiLevelRewardSchema.index({ earnerId: 1, createdAt: -1 });
multiLevelRewardSchema.index({ fromUserId: 1, createdAt: -1 });

const MultiLevelReward: Model<IMultiLevelReward> = mongoose.model<IMultiLevelReward>(
  'MultiLevelReward',
  multiLevelRewardSchema,
);

export default MultiLevelReward;
