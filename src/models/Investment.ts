import mongoose, { Schema, Model } from 'mongoose';
import { IInvestment } from '../types';

const investmentSchema = new Schema<IInvestment>(
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
      min: 0,
    },
    investedBefore: {
      type: Number,
      required: true,
    },
    investedAfter: {
      type: Number,
      required: true,
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
    lastRoiCreditedAt: {
      type: Date,
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

// Set lastRoiCreditedAt to createdAt on first save if not set
investmentSchema.pre('save', function (next) {
  if (!this.lastRoiCreditedAt) {
    this.lastRoiCreditedAt = this.createdAt || new Date();
  }
  next();
});

investmentSchema.index({ userId: 1, createdAt: -1 });
investmentSchema.index({ userId: 1, lastRoiCreditedAt: 1 });

const Investment: Model<IInvestment> = mongoose.model<IInvestment>('Investment', investmentSchema);

export default Investment;
