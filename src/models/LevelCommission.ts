import mongoose, { Schema, Model } from 'mongoose';
import { ILevelCommission } from '../types';

const levelCommissionSchema = new Schema<ILevelCommission>(
  {
    level: {
      type: Number,
      required: true,
      unique: true,
      min: 1,
      max: 10,
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
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

const LevelCommission: Model<ILevelCommission> = mongoose.model<ILevelCommission>(
  'LevelCommission',
  levelCommissionSchema,
);

export const DEFAULT_LEVEL_COMMISSIONS = [
  { level: 1, percentage: 25 },
  { level: 2, percentage: 10 },
  { level: 3, percentage: 5 },
  { level: 4, percentage: 3 },
  { level: 5, percentage: 2 },
  { level: 6, percentage: 2 },
  { level: 7, percentage: 1 },
  { level: 8, percentage: 1 },
  { level: 9, percentage: 0.5 },
  { level: 10, percentage: 0.5 },
];

export const seedLevelCommissions = async (): Promise<void> => {
  const count = await LevelCommission.countDocuments();
  if (count === 0) {
    await LevelCommission.insertMany(DEFAULT_LEVEL_COMMISSIONS);
  }
};

export default LevelCommission;
