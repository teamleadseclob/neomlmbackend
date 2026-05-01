import mongoose, { Schema, Model } from 'mongoose';
import { IRankBonusReward } from '../types';

const rankBonusRewardSchema = new Schema<IRankBonusReward>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    distributionId: { type: Schema.Types.ObjectId, ref: 'RankBonusDistribution', required: true },
    rankOrder: { type: Number, required: true },
    rankName: { type: String, required: true },
    grossAmount: { type: Number, required: true },
    cutoffAmount: { type: Number, required: true },
    netAmount: { type: Number, required: true },
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

rankBonusRewardSchema.index({ userId: 1, createdAt: -1 });

const RankBonusReward: Model<IRankBonusReward> = mongoose.model<IRankBonusReward>(
  'RankBonusReward',
  rankBonusRewardSchema,
);

export default RankBonusReward;
