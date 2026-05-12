import mongoose, { Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser } from '../types';

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    userId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    walletBalance: {
      type: Number,
      default: 0,
      min: [0, 'Wallet balance cannot be negative'],
    },
    sponsorId: {
      type: String,
      // required: [true, 'sponsorId is required'],
      default: null,
      index: true,
    },
    swpBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxInvestmentLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalInvested: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSwpVolume: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalRoiEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalMultiLevelEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalGrossEarnings: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCutoffDeducted: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
      min: 0,
    },
    withdrawnAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastWithdrawalDate: {
      type: Date,
      default: null,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      default: null,
      select: false,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: null,
    },
    country: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },
    state: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },
    phoneNumber: {
      type: String,
      trim: true,
      maxlength: 20,
      default: null,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    dob: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || (this as any).$skipPasswordHash) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

export default User;
