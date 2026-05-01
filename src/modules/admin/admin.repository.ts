import { FilterQuery, SortOrder, Types } from 'mongoose';
import User from '../../models/User';
import SwpPurchase from '../../models/SwpPurchase';
import RoiConfig, { DEFAULT_ROI_CONFIG } from '../../models/RoiConfig';
import MultiLevelRewardConfig from '../../models/MultiLevelRewardConfig';
import LevelCommission from '../../models/LevelCommission';
import { IUser, ISwpPurchase, IRoiConfig, IMultiLevelRewardConfig, ILevelCommission } from '../../types';

interface FindAllOptions {
  skip: number;
  limit: number;
  sort?: Record<string, SortOrder>;
}

class AdminRepository {
  async findAllUsers(filter: FilterQuery<IUser> = {}, { skip, limit, sort = { createdAt: -1 } }: FindAllOptions): Promise<IUser[]> {
    return User.find(filter).sort(sort).skip(skip).limit(limit);
  }

  async countUsers(filter: FilterQuery<IUser> = {}): Promise<number> {
    return User.countDocuments(filter);
  }

  async findUserById(id: string | Types.ObjectId): Promise<IUser | null> {
    return User.findById(id);
  }

  async updateUser(id: string | Types.ObjectId, updateData: Partial<IUser>): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  }

  async blockUser(id: string | Types.ObjectId): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, { isBlocked: true }, { new: true });
  }

  async unblockUser(id: string | Types.ObjectId): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, { isBlocked: false }, { new: true });
  }

  async createSwpPurchase(data: Pick<ISwpPurchase, 'userId' | 'amount' | 'swpBefore' | 'swpAfter' | 'purchaseType'>): Promise<ISwpPurchase> {
    return SwpPurchase.create(data);
  }

  async findActiveRoiConfig(): Promise<IRoiConfig | null> {
    return RoiConfig.findOne({ isActive: true });
  }

  async createRoiConfig(): Promise<IRoiConfig> {
    return RoiConfig.create(DEFAULT_ROI_CONFIG);
  }

  async updateRoiConfig(id: Types.ObjectId, updateData: Partial<IRoiConfig>): Promise<IRoiConfig> {
    return RoiConfig.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }) as Promise<IRoiConfig>;
  }

  // Multi-Level Reward Config
  async findAllMultiLevelConfigs(): Promise<IMultiLevelRewardConfig[]> {
    return MultiLevelRewardConfig.find().sort({ level: 1 });
  }

  async findMultiLevelConfigByLevel(level: number): Promise<IMultiLevelRewardConfig | null> {
    return MultiLevelRewardConfig.findOne({ level });
  }

  async updateMultiLevelConfig(
    level: number,
    updateData: Partial<Pick<IMultiLevelRewardConfig, 'percentage' | 'requiredRankOrder' | 'isActive'>>,
  ): Promise<IMultiLevelRewardConfig | null> {
    return MultiLevelRewardConfig.findOneAndUpdate({ level }, updateData, { new: true, runValidators: true });
  }

  // Level Commission Config (SWP purchase commissions)
  async findAllLevelCommissions(): Promise<ILevelCommission[]> {
    return LevelCommission.find().sort({ level: 1 });
  }

  async findLevelCommissionByLevel(level: number): Promise<ILevelCommission | null> {
    return LevelCommission.findOne({ level });
  }

  async updateLevelCommission(
    level: number,
    updateData: Partial<Pick<ILevelCommission, 'percentage' | 'isActive'>>,
  ): Promise<ILevelCommission | null> {
    return LevelCommission.findOneAndUpdate({ level }, updateData, { new: true, runValidators: true });
  }
}

export default new AdminRepository();
