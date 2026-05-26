import mongoose, { Schema, Model } from 'mongoose';
import { ISwpPurchase } from '../types';

const swpPurchaseSchema = new Schema<ISwpPurchase>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    swpBefore: {
      type: Number,
      required: true,
    },
    swpAfter: {
      type: Number,
      required: true,
    },
    purchaseType:{
      type: String,
      enum: ['SWP', 'admin'],
      required: true,
      default: 'SWP'
    },
    paymentMethod: {
      type: String,
      enum: ['web3', 'wallet'],
      required: true,
      default: 'web3',
    },
    walletAddress: {
      type: String,
      default: null,
    },
    transactionHash: {
      type: String,
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

swpPurchaseSchema.index({ userId: 1, createdAt: -1 });

export const ALLOWED_SWP_AMOUNTS = [100, 200, 300, 500, 700, 1000];
export const SWP_MULTIPLIER = 10;
export const MIN_INVESTMENT = 50;
export const MAX_SWP_CAP = 1000;

/**
 * Investment limit tiers — the SWP balance thresholds that unlock new limits.
 * Limit = matching tier × 10
 * e.g. SWP $400 → tier $300 → limit $3,000
 *      SWP $700 → tier $700 → limit $7,000
 *      SWP $800 → tier $700 → limit $7,000
 */
const INVESTMENT_TIERS = [100, 200, 300, 500, 700, 1000];

export const getInvestmentLimit = (swpBalance: number): number => {
  const matchingTier = [...INVESTMENT_TIERS]
    .reverse()
    .find((tier) => swpBalance >= tier);
  return (matchingTier ?? 0) * SWP_MULTIPLIER;
};

const SwpPurchase: Model<ISwpPurchase> = mongoose.model<ISwpPurchase>('SwpPurchase', swpPurchaseSchema);

export default SwpPurchase;
