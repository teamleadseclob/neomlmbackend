import { Types, Document, Model } from 'mongoose';
import { Request } from 'express';

// User
export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  userId: string;
  role: 'user' | 'admin';
  walletBalance: number;
  sponsorId: string | null;
  swpBalance: number;
  maxInvestmentLimit: number;
  totalInvested: number;
  totalSwpVolume: number;
  totalRoiEarned: number;
  totalMultiLevelEarned: number;
  totalGrossEarnings: number;
  totalCutoffDeducted: number;
  totalEarnings: number;
  withdrawnAmount: number;
  lastWithdrawalDate: Date | null;
  isBlocked: boolean;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  gender: 'male' | 'female' | 'other' | null;
  country: string | null;
  state: string | null;
  phoneNumber: string | null;
  address: string | null;
  dob: Date | null;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// TeamStats
export interface ITeamStats extends Document {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  referralId: Types.ObjectId;
  teamSwpVolume: number;
  createdAt: Date;
  updatedAt: Date;
}

// Network
export interface INetwork extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  parentId: Types.ObjectId | null;
  level: number;
  createdAt: Date;
  updatedAt: Date;
}

// Level Commission (admin-configurable, auto-seeded)
export interface ILevelCommission extends Document {
  _id: Types.ObjectId;
  level: number;
  percentage: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ROI Config (settings)
export interface IRoiConfig extends Document {
  _id: Types.ObjectId;
  dailyRoiPercentage: number;
  minInvestment: number;
  maxInvestment: number;
  roiDurationDays: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ROI History (per-user per-distribution log)
export interface IRoiHistory extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  roiConfigId: Types.ObjectId;
  totalInvestedAmount: number;
  roiPercentage: number;
  daysCalculated: number;
  roiEarned: number;
  roiCapped: boolean;
  capApplied: number;
  totalRoiBefore: number;
  totalRoiAfter: number;
  distributionBatchId: string;
  createdAt: Date;
}

// SWP Purchase log
export interface ISwpPurchase extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  amount: number;
  swpBefore: number;
  swpAfter: number;
  purchaseType: 'SWP' | 'admin';
  paymentMethod: 'web3' | 'wallet';
  walletAddress: string | null;
  transactionHash: string | null;
  createdAt: Date;
}

// Commission log
export interface ICommission extends Document {
  _id: Types.ObjectId;
  earnerId: Types.ObjectId;
  fromUserId: Types.ObjectId;
  swpPurchaseId: Types.ObjectId;
  level: number;
  type: 'referral' | 'level';
  percentage: number;
  amount: number;
  grossAmount: number;
  cutoffAmount: number;
  netAmount: number;
  createdAt: Date;
}

// Investment
export interface IInvestment extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  amount: number;
  investedBefore: number;
  investedAfter: number;
  paymentMethod: 'web3' | 'wallet';
  walletAddress: string | null;
  transactionHash: string | null;
  lastRoiCreditedAt: Date;
  createdAt: Date;
}

// Auth
export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  sponsorId?: string;
}

export interface LoginInput {
  userId: string;
  password: string;
  totpCode?: string;
}

export interface AuthResult {
  user: {
    _id: Types.ObjectId;
    name: string;
    email: string;
    userId: string;
    role: string;
  };
  token: string;
}

// Network
export interface TreeNode {
  _id: Types.ObjectId;
  name: string;
  email: string;
  userId: string;
  level: number;
  children: TreeNode[];
}

export interface NetworkStats {
  totalNodes: number;
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  levelStats: { level: number; count: number }[];
}

export interface UserNetworkStats {
  userId: string;
  name: string;
  level: number;
  totalDownline: number;
  directReferrals: number;
  teamSwpVolume: number;
  teamInvestmentVolume: number;
}

// Pagination
export interface PaginationQuery {
  page?: string;
  limit?: string;
  [key: string]: unknown;
}

export interface Pagination {
  page: number;
  limit: number;
  skip: number;
  totalPages: number;
  totalDocs: number;
}

// Express extensions
export interface AuthRequest extends Request {
  user: IUser;
}

// Rank Config (admin-configurable, auto-seeded)
export interface IRankConfig extends Document {
  _id: Types.ObjectId;
  order: number;
  name: string;
  requiredTeams: number;
  totalSwpVolume: number;
  maxVolPerTeam: number;
  reward: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Rank Reward log (one per user per rank)
export interface IRankReward extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  rankConfigId: Types.ObjectId;
  rankName: string;
  reward: number;
  grossAmount: number;
  cutoffAmount: number;
  netAmount: number;
  createdAt: Date;
}

// Multi-Level Reward Config (admin-configurable, auto-seeded)
export interface IMultiLevelRewardConfig extends Document {
  _id: Types.ObjectId;
  level: number;
  percentage: number;
  requiredRankOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Multi-Level Reward log
export interface IMultiLevelReward extends Document {
  _id: Types.ObjectId;
  earnerId: Types.ObjectId;
  fromUserId: Types.ObjectId;
  roiHistoryId: Types.ObjectId;
  level: number;
  percentage: number;
  roiAmount: number;
  rewardAmount: number;
  grossAmount: number;
  cutoffAmount: number;
  netAmount: number;
  requiredRankOrder: number;
  earnerRankOrder: number;
  distributionBatchId: string;
  createdAt: Date;
}

// Rank Bonus Config (admin-configurable percentages for top ranks)
export interface IRankBonusConfig extends Document {
  _id: Types.ObjectId;
  rankOrder: number;
  percentage: number;
  createdAt: Date;
  updatedAt: Date;
}

// Rank Bonus per-user reward log
export interface IRankBonusReward extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  distributionId: Types.ObjectId;
  rankOrder: number;
  rankName: string;
  grossAmount: number;
  cutoffAmount: number;
  netAmount: number;
  createdAt: Date;
}

// Mnemonic
export interface IMnemonic extends Document {
  _id: Types.ObjectId;
  encryptedMnemonic: string;
  mnemonic?: string;
  isEncrypted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMnemonicModel extends Model<IMnemonic> {
  createEncrypted(plaintextMnemonic: string): Promise<IMnemonic>;
  getDecrypted(): Promise<string | null>;
}

// Rank Bonus Distribution log
export interface IRankBonusDistribution extends Document {
  _id: Types.ObjectId;
  amount: number;
  distributedBy: Types.ObjectId;
  breakdown: {
    rankOrder: number;
    rankName: string;
    percentage: number;
    perUserAmount: number;
    userCount: number;
    totalDistributed: number;
  }[];
  totalDistributed: number;
  createdAt: Date;
}

// Transaction
export interface ITransaction extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: string;
  amount: number;
  walletAddress: string;
  status: string;
  txHash: string | null;
  blockNumber: number | null;
  description: string;
  calculationDetails: Record<string, unknown>;
  failureReason: string | null;
  rejectionReason: string | null;
  approvedBy: Types.ObjectId | null;
  rejectedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

// Validation schema shape
export interface ValidationSchema {
  body?: import('joi').Schema;
  query?: import('joi').ObjectSchema;
  params?: import('joi').ObjectSchema;
}
