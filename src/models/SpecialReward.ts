import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface ISpecialReward extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  amount: number;
  grossAmount: number;
  cutoffAmount: number;
  netAmount: number;
  grantedBy: Types.ObjectId;
  createdAt: Date;
}

const specialRewardSchema = new Schema<ISpecialReward>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    grossAmount: { type: Number, default: 0 },
    cutoffAmount: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    grantedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

const SpecialReward: Model<ISpecialReward> = mongoose.model<ISpecialReward>('SpecialReward', specialRewardSchema);

export default SpecialReward;
