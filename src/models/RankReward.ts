import mongoose, { Schema, Model } from 'mongoose';
import { IRankReward } from '../types';

const rankRewardSchema = new Schema<IRankReward>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rankConfigId: { type: Schema.Types.ObjectId, ref: 'RankConfig', required: true },
    rankName: { type: String, required: true },
    reward: { type: Number, required: true, min: 0 },
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

rankRewardSchema.index({ userId: 1, rankConfigId: 1 }, { unique: true });

const RankReward: Model<IRankReward> = mongoose.model<IRankReward>('RankReward', rankRewardSchema);

export default RankReward;
