import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface IPoolReward extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  amount: number;
  swpBalance: number;
  ratePerHundred: number;
  percentage: number;
  distributedBy: Types.ObjectId;
  createdAt: Date;
}

const poolRewardSchema = new Schema<IPoolReward>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    swpBalance: { type: Number, required: true },
    ratePerHundred: { type: Number, required: true },
    percentage: { type: Number, required: true },
    distributedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const PoolReward: Model<IPoolReward> = mongoose.model<IPoolReward>('PoolReward', poolRewardSchema);

export default PoolReward;
