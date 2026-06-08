import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IRankBonusAmountConfig extends Document {
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

const rankBonusAmountConfigSchema = new Schema<IRankBonusAmountConfig>(
  {
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Amount must be at least 0.01'],
    },
  },
  { timestamps: true },
);

export const DEFAULT_RANK_BONUS_AMOUNT = 1000;

export const getRankBonusAmountConfig = async (): Promise<IRankBonusAmountConfig> => {
  let config = await RankBonusAmountConfig.findOne();
  if (!config) config = await RankBonusAmountConfig.create({ amount: DEFAULT_RANK_BONUS_AMOUNT });
  return config;
};

const RankBonusAmountConfig: Model<IRankBonusAmountConfig> = mongoose.model<IRankBonusAmountConfig>(
  'RankBonusAmountConfig',
  rankBonusAmountConfigSchema,
);

export default RankBonusAmountConfig;
