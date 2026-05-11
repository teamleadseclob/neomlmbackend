import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface IRoiDistribution extends Document {
  _id: Types.ObjectId;
  batchId: string;
  distributedBy: Types.ObjectId;
  totalUsersProcessed: number;
  totalUsersEarned: number;
  totalUsersSkipped: number;
  totalUsersCapped: number;
  totalRoiDistributed: number;
  totalMultiLevelRewardsDistributed: number;
  roiPercentage: number;
  distributedAt: Date;
  createdAt: Date;
}

const roiDistributionSchema = new Schema<IRoiDistribution>(
  {
    batchId: { type: String, required: true, unique: true, index: true },
    distributedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    totalUsersProcessed: { type: Number, required: true },
    totalUsersEarned: { type: Number, required: true },
    totalUsersSkipped: { type: Number, required: true },
    totalUsersCapped: { type: Number, required: true },
    totalRoiDistributed: { type: Number, required: true },
    totalMultiLevelRewardsDistributed: { type: Number, required: true },
    roiPercentage: { type: Number, required: true },
    distributedAt: { type: Date, required: true },
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

const RoiDistribution: Model<IRoiDistribution> = mongoose.model<IRoiDistribution>('RoiDistribution', roiDistributionSchema);

export default RoiDistribution;
