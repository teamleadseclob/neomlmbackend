import mongoose, { Schema, Model } from 'mongoose';
import { IRoiConfig } from '../types';

const roiConfigSchema = new Schema<IRoiConfig>(
  {
    dailyRoiPercentage: {
      type: Number,
      required: [true, 'Daily ROI percentage is required'],
      min: [0, 'ROI percentage cannot be negative'],
      max: [100, 'ROI percentage cannot exceed 100'],
    },
    minInvestment: {
      type: Number,
      required: [true, 'Minimum investment is required'],
      min: [0, 'Minimum investment cannot be negative'],
    },
    maxInvestment: {
      type: Number,
      required: [true, 'Maximum investment is required'],
      min: [0, 'Maximum investment cannot be negative'],
    },
    roiDurationDays: {
      type: Number,
      required: [true, 'ROI duration in days is required'],
      min: [1, 'Duration must be at least 1 day'],
    },
    effectiveFrom: {
      type: Date,
      required: [true, 'Effective from date is required'],
    },
    effectiveTo: {
      type: Date,
      default: null,
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

export const DEFAULT_ROI_CONFIG = {
  dailyRoiPercentage: 1,
  minInvestment: 50,
  maxInvestment: 10000,
  roiDurationDays: 300,
  effectiveFrom: new Date(),
  effectiveTo: null,
};

export const seedRoiConfig = async (): Promise<void> => {
  const count = await RoiConfig.countDocuments();
  if (count === 0) {
    await RoiConfig.create(DEFAULT_ROI_CONFIG);
  }
};

const RoiConfig: Model<IRoiConfig> = mongoose.model<IRoiConfig>('RoiConfig', roiConfigSchema);

export default RoiConfig;
