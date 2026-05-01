import mongoose, { Schema, Model } from 'mongoose';
import { IRankBonusDistribution } from '../types';

const rankBonusDistributionSchema = new Schema<IRankBonusDistribution>(
  {
    amount: { type: Number, required: true },
    distributedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    breakdown: [
      {
        rankOrder: { type: Number, required: true },
        rankName: { type: String, required: true },
        percentage: { type: Number, required: true },
        perUserAmount: { type: Number, required: true },
        userCount: { type: Number, required: true },
        totalDistributed: { type: Number, required: true },
      },
    ],
    totalDistributed: { type: Number, required: true },
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

const RankBonusDistribution: Model<IRankBonusDistribution> = mongoose.model<IRankBonusDistribution>(
  'RankBonusDistribution',
  rankBonusDistributionSchema,
);

export default RankBonusDistribution;
