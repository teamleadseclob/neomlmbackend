import mongoose, { Schema, Model } from 'mongoose';

export const FUND_PERCENTAGES = {
  poolFund: 2,
  managementFund: 3,
  operationWalletFund: 5,
} as const;

interface ISystemFund {
  poolFund: number;
  managementFund: number;
  operationWalletFund: number;
}

const systemFundSchema = new Schema<ISystemFund>(
  {
    poolFund: { type: Number, default: 0 },
    managementFund: { type: Number, default: 0 },
    operationWalletFund: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const SystemFund: Model<ISystemFund> = mongoose.model<ISystemFund>('SystemFund', systemFundSchema);

export const getSystemFund = async (): Promise<ISystemFund> => {
  let fund = await SystemFund.findOne();
  if (!fund) fund = await SystemFund.create({});
  return fund;
};

export const creditFunds = async (purchaseAmount: number): Promise<void> => {
  const inc = {
    poolFund: (purchaseAmount * FUND_PERCENTAGES.poolFund) / 100,
    managementFund: (purchaseAmount * FUND_PERCENTAGES.managementFund) / 100,
    operationWalletFund: (purchaseAmount * FUND_PERCENTAGES.operationWalletFund) / 100,
  };
  await SystemFund.findOneAndUpdate({}, { $inc: inc }, { upsert: true });
};

export default SystemFund;
