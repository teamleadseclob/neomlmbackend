import mongoose, { Schema, Model } from 'mongoose';
import { IRankConfig } from '../types';

const rankConfigSchema = new Schema<IRankConfig>(
  {
    order: { type: Number, required: true, unique: true },
    name: { type: String, required: true, unique: true, trim: true },
    requiredTeams: { type: Number, required: true, min: 1 },
    totalSwpVolume: { type: Number, required: true, min: 0 },
    maxVolPerTeam: { type: Number, required: true, min: 0 },
    reward: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
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

const RankConfig: Model<IRankConfig> = mongoose.model<IRankConfig>('RankConfig', rankConfigSchema);

export const DEFAULT_RANK_CONFIGS = [
  { order: 1, name: 'Connector', requiredTeams: 2, totalSwpVolume: 4000, maxVolPerTeam: 2000, reward: 100 },
  { order: 2, name: 'Leader', requiredTeams: 3, totalSwpVolume: 12000, maxVolPerTeam: 4000, reward: 500 },
  { order: 3, name: 'Mentor', requiredTeams: 4, totalSwpVolume: 25000, maxVolPerTeam: 6250, reward: 1000 },
  { order: 4, name: 'Influencer', requiredTeams: 5, totalSwpVolume: 75000, maxVolPerTeam: 15000, reward: 2500 },
  { order: 5, name: 'Authority', requiredTeams: 6, totalSwpVolume: 120000, maxVolPerTeam: 20000, reward: 5000 },
];

export const seedRankConfigs = async (): Promise<void> => {
  const count = await RankConfig.countDocuments();
  if (count === 0) {
    await RankConfig.insertMany(DEFAULT_RANK_CONFIGS);
  }
};

export default RankConfig;
