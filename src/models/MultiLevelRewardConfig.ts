import mongoose, { Schema, Model } from 'mongoose';
import { IMultiLevelRewardConfig } from '../types';

const multiLevelRewardConfigSchema = new Schema<IMultiLevelRewardConfig>(
  {
    level: {
      type: Number,
      required: true,
      unique: true,
      min: 1,
      max: 20,
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    requiredRankOrder: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
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

const MultiLevelRewardConfig: Model<IMultiLevelRewardConfig> = mongoose.model<IMultiLevelRewardConfig>(
  'MultiLevelRewardConfig',
  multiLevelRewardConfigSchema,
);

// Default config:
// Levels 1-3:   No rank needed (order 0)
// Levels 4-8:   Connector (order 1)
// Levels 9-14:  Leader (order 2)
// Levels 15-20: Mentor (order 3)
// All percentages = 0 (admin sets them)
const getRequiredRankOrder = (level: number): number => {
  if (level <= 3) return 0;
  if (level <= 8) return 1;
  if (level <= 14) return 2;
  return 3;
};

export const DEFAULT_MULTI_LEVEL_CONFIGS = Array.from({ length: 20 }, (_, i) => ({
  level: i + 1,
  percentage: 0,
  requiredRankOrder: getRequiredRankOrder(i + 1),
  isActive: true,
}));

export const seedMultiLevelRewardConfigs = async (): Promise<void> => {
  const count = await MultiLevelRewardConfig.countDocuments();
  if (count === 0) {
    await MultiLevelRewardConfig.insertMany(DEFAULT_MULTI_LEVEL_CONFIGS);
  }
};

export default MultiLevelRewardConfig;
