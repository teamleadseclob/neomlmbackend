import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export type KycStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected';
export type DocumentType = 'aadhaar' | 'pan' | 'passport' | 'driving_license';

export interface IKyc extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  documentType: DocumentType;
  documentNumber: string;
  documentImage: string;
  status: KycStatus;
  rejectionReason: string | null;
  reviewedBy: Types.ObjectId | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const kycSchema = new Schema<IKyc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    documentType: {
      type: String,
      enum: ['aadhaar', 'pan', 'passport', 'driving_license'],
      required: true,
    },
    documentNumber: { type: String, required: true, trim: true },
    documentImage: { type: String, required: true },
    status: {
      type: String,
      enum: ['not_submitted', 'pending', 'approved', 'rejected'],
      default: 'pending',
    },
    rejectionReason: { type: String, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
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

kycSchema.index({ userId: 1, status: 1 });

const Kyc: Model<IKyc> = mongoose.model<IKyc>('Kyc', kycSchema);

export default Kyc;
