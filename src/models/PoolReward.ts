import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface IPoolReward extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  amount: number;
  grossAmount: number;
  cutoffAmount: number;
  netAmount: number;
  swpBalance: number;
  percentage: number;
  createdAt: Date;
}

const poolRewardSchema = new Schema<IPoolReward>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    grossAmount: { type: Number, default: 0 },
    cutoffAmount: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    swpBalance: { type: Number, required: true },
    percentage: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const PoolReward: Model<IPoolReward> = mongoose.model<IPoolReward>('PoolReward', poolRewardSchema);

export default PoolReward;
