import mongoose, { Schema, Model } from 'mongoose';
import { ITeamStats } from '../types';

const teamStatsSchema = new Schema<ITeamStats>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    referralId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    teamSwpVolume: {
      type: Number,
      default: 0,
      min: 0,
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

teamStatsSchema.index({ ownerId: 1, referralId: 1 }, { unique: true });

const TeamStats: Model<ITeamStats> = mongoose.model<ITeamStats>('TeamStats', teamStatsSchema);

export default TeamStats;
