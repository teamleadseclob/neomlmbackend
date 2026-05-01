import mongoose, { Schema, Model } from 'mongoose';
import { IRankBonusConfig } from '../types';

const rankBonusConfigSchema = new Schema<IRankBonusConfig>(
  {
    rankOrder: { type: Number, required: true, unique: true },
    percentage: { type: Number, required: true, min: 0 },
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

const RankBonusConfig: Model<IRankBonusConfig> = mongoose.model<IRankBonusConfig>(
  'RankBonusConfig',
  rankBonusConfigSchema,
);

export const DEFAULT_RANK_BONUS_CONFIGS = [
  { rankOrder: 4, percentage: 5 },
  { rankOrder: 5, percentage: 10 },
];

export const seedRankBonusConfigs = async (): Promise<void> => {
  const count = await RankBonusConfig.countDocuments();
  if (count === 0) {
    await RankBonusConfig.insertMany(DEFAULT_RANK_BONUS_CONFIGS);
  }
};

export default RankBonusConfig;
