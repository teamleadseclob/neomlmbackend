import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface IFundHistory extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  swpPurchaseAmount: number;
  poolFund: number;
  managementFund: number;
  operationWalletFund: number;
  createdAt: Date;
}

const fundHistorySchema = new Schema<IFundHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    swpPurchaseAmount: { type: Number, required: true },
    poolFund: { type: Number, required: true },
    managementFund: { type: Number, required: true },
    operationWalletFund: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const FundHistory: Model<IFundHistory> = mongoose.model<IFundHistory>('FundHistory', fundHistorySchema);

export default FundHistory;
