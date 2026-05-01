import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IPendingRegistration extends Document {
  name: string;
  email: string;
  password: string;
  sponsorId: string | null;
  otp: string;
  otpExpiresAt: Date;
  attempts: number;
  createdAt: Date;
}

const pendingRegistrationSchema = new Schema<IPendingRegistration>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    password: { type: String, required: true },
    sponsorId: { type: String, default: null },
    otp: { type: String, required: true },
    otpExpiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// Auto-delete expired documents (MongoDB TTL index)
// Documents are removed ~60 seconds after otpExpiresAt
pendingRegistrationSchema.index({ otpExpiresAt: 1 }, { expireAfterSeconds: 0 });

const PendingRegistration: Model<IPendingRegistration> = mongoose.model<IPendingRegistration>(
  'PendingRegistration',
  pendingRegistrationSchema,
);

export default PendingRegistration;
