import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface IMarketInterest extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  marketTitle: string;
  status: 'pending' | 'accepted';
  url: string | null;
  isRead: boolean;
  createdAt: Date;
}

const marketInterestSchema = new Schema<IMarketInterest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    marketTitle: { type: String, required: true, trim: true },
    status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
    url: { type: String, default: null },
    isRead: { type: Boolean, default: false },
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

marketInterestSchema.index({ userId: 1, marketTitle: 1 }, { unique: true });
marketInterestSchema.index({ marketTitle: 1, createdAt: -1 });

const MarketInterest: Model<IMarketInterest> = mongoose.model<IMarketInterest>('MarketInterest', marketInterestSchema);

export default MarketInterest;
