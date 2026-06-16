import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import ApiError from '../../utils/ApiError';
import { buildPagination } from '../../utils/helpers';
import adminRepository from './admin.repository';
import networkService from '../network/network.service';
import { getInvestmentLimit } from '../../models/SwpPurchase';
import User from '../../models/User';
import SwpPurchase from '../../models/SwpPurchase';
import Investment from '../../models/Investment';
import Commission from '../../models/Commission';
import RoiHistory from '../../models/RoiHistory';
import MultiLevelReward from '../../models/MultiLevelReward';
import RankReward from '../../models/RankReward';
import RankBonusReward from '../../models/RankBonusReward';
import Transaction from '../../models/Transaction';
import RoiDistribution from '../../models/RoiDistribution';
import SpecialReward from '../../models/SpecialReward';
import SystemFund, { getSystemFund } from '../../models/SystemFund';
import PoolReward from '../../models/PoolReward';
import { getPoolConfig } from '../../models/PoolConfig';
import { calculateCutoff } from '../../utils/cutoff';
import { notifyEarning } from '../../utils/notifyEarning';
import { IUser, IRoiConfig, IMultiLevelRewardConfig, ILevelCommission, Pagination, NetworkStats } from '../../types';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface AdminQuery {
  page?: string;
  limit?: string;
  isBlocked?: string;
  search?: string;
  [key: string]: unknown;
}

class AdminService {
  async getUsers(query: AdminQuery): Promise<{ users: IUser[]; pagination: Pagination }> {
    const filter: Record<string, unknown> = { role: { $ne: 'admin' } };

    if (query.isBlocked !== undefined) {
      filter.isBlocked = query.isBlocked === 'true';
    }

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
        { userId: { $regex: query.search, $options: 'i' } },
      ];
    }

    const totalDocs = await adminRepository.countUsers(filter);
    const pagination = buildPagination(query, totalDocs);

    const users = await adminRepository.findAllUsers(filter, {
      skip: pagination.skip,
      limit: pagination.limit,
    });

    return { users, pagination };
  }

  async getUserById(id: string): Promise<IUser> {
    const user = await adminRepository.findUserById(id);
    if (!user) throw ApiError.notFound('User not found');
    return user;
  }

  async blockUser(id: string): Promise<IUser | null> {
    const user = await adminRepository.findUserById(id);
    if (!user) throw ApiError.notFound('User not found');
    if (user.role === 'admin') throw ApiError.forbidden('Cannot block an admin user');
    if (user.isBlocked) throw ApiError.conflict('User is already blocked');
    return adminRepository.blockUser(id);
  }

  async unblockUser(id: string): Promise<IUser | null> {
    const user = await adminRepository.findUserById(id);
    if (!user) throw ApiError.notFound('User not found');
    if (!user.isBlocked) throw ApiError.conflict('User is not blocked');
    return adminRepository.unblockUser(id);
  }

  async getDashboard() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayFilter = { createdAt: { $gte: todayStart } };

    const [
      totalUsers,
      todayUsers,
      swpAgg,
      swpTodayAgg,
      investAgg,
      investTodayAgg,
      commissionAgg,
      commissionTodayAgg,
      roiAgg,
      roiTodayAgg,
      mlrAgg,
      mlrTodayAgg,
      rankAgg,
      rankTodayAgg,
      withdrawalAgg,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      User.countDocuments({ role: { $ne: 'admin' }, ...todayFilter }),
      SwpPurchase.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
      SwpPurchase.aggregate([{ $match: todayFilter }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Investment.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
      Investment.aggregate([{ $match: todayFilter }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      Commission.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
      Commission.aggregate([{ $match: todayFilter }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      RoiHistory.aggregate([{ $group: { _id: null, total: { $sum: '$roiEarned' } } }]),
      RoiHistory.aggregate([{ $match: todayFilter }, { $group: { _id: null, total: { $sum: '$roiEarned' } } }]),
      MultiLevelReward.aggregate([{ $group: { _id: null, total: { $sum: '$rewardAmount' } } }]),
      MultiLevelReward.aggregate([{ $match: todayFilter }, { $group: { _id: null, total: { $sum: '$rewardAmount' } } }]),
      RankReward.aggregate([{ $group: { _id: null, total: { $sum: '$reward' } } }]),
      RankReward.aggregate([{ $match: todayFilter }, { $group: { _id: null, total: { $sum: '$reward' } } }]),
      Transaction.aggregate([
        { $match: { type: 'withdrawal' } },
        { $group: { _id: '$status', total: { $sum: '$amount' } } },
      ]),
    ]);

    const withdrawalMap: Record<string, number> = {};
    for (const entry of withdrawalAgg) withdrawalMap[entry._id] = entry.total;

    const systemFund = await getSystemFund();

    return {
      totalUsers: { total: totalUsers, today: todayUsers },
      totalSwpPurchased: { total: swpAgg[0]?.total ?? 0, today: swpTodayAgg[0]?.total ?? 0 },
      totalInvested: { total: investAgg[0]?.total ?? 0, today: investTodayAgg[0]?.total ?? 0 },
      totalLevelIncome: { total: commissionAgg[0]?.total ?? 0, today: commissionTodayAgg[0]?.total ?? 0 },
      totalRoiDistributed: { total: roiAgg[0]?.total ?? 0, today: roiTodayAgg[0]?.total ?? 0 },
      totalMultiLevelReward: { total: mlrAgg[0]?.total ?? 0, today: mlrTodayAgg[0]?.total ?? 0 },
      totalRankIncome: { total: rankAgg[0]?.total ?? 0, today: rankTodayAgg[0]?.total ?? 0 },
      totalPendingWithdrawal: withdrawalMap['pending'] ?? 0,
      totalPaidWithdrawal: withdrawalMap['completed'] ?? 0,
      poolFund: systemFund.poolFund,
      managementFund: systemFund.managementFund,
      operationWalletFund: systemFund.operationWalletFund,
    };
  }

  async getNetworkStats(): Promise<NetworkStats> {
    return networkService.getNetworkStats();
  } 

  async grantSwp(id: string, amount: number) {
    const user = await adminRepository.findUserById(id);
    if (!user) throw ApiError.notFound('User not found');
    if (user.role === 'admin') throw ApiError.forbidden('Cannot grant SWP to an admin');
    if (user.isBlocked) throw ApiError.forbidden('Cannot grant SWP to a blocked user');

    const swpBefore = user.swpBalance;
    const swpAfter = swpBefore + amount;
    const maxInvestmentLimit = getInvestmentLimit(swpAfter);

    await adminRepository.updateUser(id, { swpBalance: swpAfter, maxInvestmentLimit });

    await adminRepository.createSwpPurchase({
      userId: user._id,
      amount,
      swpBefore,
      swpAfter,
      purchaseType: 'admin',
    });

    return {
      userId: user.userId,
      name: user.name,
      swpBalance: swpAfter,
      maxInvestmentLimit,
    };
  }

  private async getOrCreateRoiConfig(): Promise<IRoiConfig> {
    const config = await adminRepository.findActiveRoiConfig();
    if (config) return config;
    return adminRepository.createRoiConfig();
  }

  async getRoiConfig() {
    const config = await this.getOrCreateRoiConfig();
    const lastDistribution = await RoiDistribution.findOne().sort({ distributedAt: -1 }).select('totalRoiDistributed distributedAt').lean();

    return {
      ...config.toJSON(),
      lastDistributedAmount: lastDistribution?.totalRoiDistributed ?? 0,
      lastDistributedAt: lastDistribution?.distributedAt ?? null,
    };
  }

  async updateRoiConfig(dailyRoiPercentage: number): Promise<IRoiConfig> {
    const config = await this.getOrCreateRoiConfig();
    return adminRepository.updateRoiConfig(config._id, { dailyRoiPercentage });
  }

  // Multi-Level Reward Config
  async getMultiLevelRewardConfigs(): Promise<IMultiLevelRewardConfig[]> {
    return adminRepository.findAllMultiLevelConfigs();
  }

  async updateMultiLevelRewardConfig(
    level: number,
    updateData: { percentage?: number; requiredRankOrder?: number; isActive?: boolean },
  ): Promise<IMultiLevelRewardConfig> {
    const config = await adminRepository.findMultiLevelConfigByLevel(level);
    if (!config) throw ApiError.notFound(`Multi-level reward config for level ${level} not found`);

    const updated = await adminRepository.updateMultiLevelConfig(level, updateData);
    if (!updated) throw ApiError.internal('Failed to update config');
    return updated;
  }

  async getRevenueChart(year: number) {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    const dateMatch = { $gte: startDate, $lte: endDate };
    const monthGroup = { $month: '$createdAt' };

    // Earnings: net amounts paid out to users
    const [commissionAgg, roiAgg, mlrAgg, rankRewardAgg, rankBonusAgg] = await Promise.all([
      Commission.aggregate([
        { $match: { createdAt: dateMatch } },
        { $group: { _id: monthGroup, value: { $sum: '$netAmount' } } },
      ]),
      RoiHistory.aggregate([
        { $match: { createdAt: dateMatch } },
        { $group: { _id: monthGroup, value: { $sum: '$roiEarned' } } },
      ]),
      MultiLevelReward.aggregate([
        { $match: { createdAt: dateMatch } },
        { $group: { _id: monthGroup, value: { $sum: '$netAmount' } } },
      ]),
      RankReward.aggregate([
        { $match: { createdAt: dateMatch } },
        { $group: { _id: monthGroup, value: { $sum: '$netAmount' } } },
      ]),
      RankBonusReward.aggregate([
        { $match: { createdAt: dateMatch } },
        { $group: { _id: monthGroup, value: { $sum: '$netAmount' } } },
      ]),
    ]);

    // Expense: user money coming in (exclude admin grants)
    const [swpAgg, investAgg] = await Promise.all([
      SwpPurchase.aggregate([
        { $match: { createdAt: dateMatch, purchaseType: 'SWP' } },
        { $group: { _id: monthGroup, value: { $sum: '$amount' } } },
      ]),
      Investment.aggregate([
        { $match: { createdAt: dateMatch } },
        { $group: { _id: monthGroup, value: { $sum: '$amount' } } },
      ]),
    ]);

    // Build month maps
    const earningsMap: Record<number, number> = {};
    const expenseMap: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) { earningsMap[m] = 0; expenseMap[m] = 0; }

    for (const agg of [commissionAgg, roiAgg, mlrAgg, rankRewardAgg, rankBonusAgg]) {
      for (const entry of agg) { earningsMap[entry._id] += entry.value; }
    }
    for (const agg of [swpAgg, investAgg]) {
      for (const entry of agg) { expenseMap[entry._id] += entry.value; }
    }

    let totalEarnings = 0;
    let totalExpense = 0;
    const monthlyData = [];

    for (let m = 1; m <= 12; m++) {
      const earnings = Math.round(earningsMap[m] * 100) / 100;
      const expense = Math.round(expenseMap[m] * 100) / 100;
      totalEarnings += earnings;
      totalExpense += expense;
      monthlyData.push({ month: m, monthName: MONTH_NAMES[m - 1], earnings, expense });
    }

    return {
      year,
      monthlyData,
      totals: {
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        totalExpense: Math.round(totalExpense * 100) / 100,
      },
    };
  }

  // Level Commission Config (SWP purchase commissions)
  async getLevelCommissions(): Promise<ILevelCommission[]> {
    return adminRepository.findAllLevelCommissions();
  }

  async updateLevelCommission(
    level: number,
    updateData: { percentage?: number; isActive?: boolean },
  ): Promise<ILevelCommission> {
    const config = await adminRepository.findLevelCommissionByLevel(level);
    if (!config) throw ApiError.notFound(`Level commission config for level ${level} not found`);

    const updated = await adminRepository.updateLevelCommission(level, updateData);
    if (!updated) throw ApiError.internal('Failed to update config');
    return updated;
  }

  // Unified Transactions
  async getTransactions(query: AdminQuery): Promise<{ transactions: any[]; pagination: Pagination }> {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const skip = (page - 1) * limit;

    const { type, userId, fromDate, toDate, search } = query as any;

    const dateFilter: Record<string, unknown> = {};
    if (fromDate) dateFilter.$gte = new Date(fromDate as string);
    if (toDate) dateFilter.$lte = new Date(toDate as string);
    const hasDateFilter = Object.keys(dateFilter).length > 0;

    // Resolve userId search to ObjectId
    let userObjectId: any = null;
    if (userId) {
      const user = await User.findOne({ userId }).select('_id').lean();
      if (!user) return { transactions: [], pagination: { page, limit, totalDocs: 0, totalPages: 0, skip } };
      userObjectId = user._id;
    }

    const typesToFetch = type
      ? [type]
      : ['withdrawal', 'swp_purchase', 'investment', 'level_commission', 'roi', 'multilevel_reward', 'rank_reward', 'rank_bonus'];

    const queries: Promise<any[]>[] = [];

    const buildFilter = (userField: string) => {
      const f: Record<string, unknown> = {};
      if (userObjectId) f[userField] = userObjectId;
      if (hasDateFilter) f.createdAt = dateFilter;
      return f;
    };

    if (typesToFetch.includes('withdrawal')) {
      const f = buildFilter('userId');
      if (search) f.$or = [{ txHash: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];
      queries.push(
        Transaction.find(f).populate('userId', 'name userId email').lean()
          .then(docs => docs.map(d => ({ ...d, txType: 'withdrawal', txAmount: d.amount, txDate: d.createdAt }))),
      );
    }

    if (typesToFetch.includes('swp_purchase')) {
      queries.push(
        SwpPurchase.find(buildFilter('userId')).populate('userId', 'name userId email').lean()
          .then(docs => docs.map(d => ({ ...d, txType: 'swp_purchase', txAmount: d.amount, txDate: d.createdAt }))),
      );
    }

    if (typesToFetch.includes('investment')) {
      queries.push(
        Investment.find(buildFilter('userId')).populate('userId', 'name userId email').lean()
          .then(docs => docs.map(d => ({ ...d, txType: 'investment', txAmount: d.amount, txDate: d.createdAt }))),
      );
    }

    if (typesToFetch.includes('level_commission')) {
      queries.push(
        Commission.find(buildFilter('earnerId')).populate('earnerId', 'name userId email').populate('fromUserId', 'name userId email').lean()
          .then(docs => docs.map(d => ({ ...d, txType: 'level_commission', txAmount: d.netAmount, txDate: d.createdAt, userId: d.earnerId }))),
      );
    }

    if (typesToFetch.includes('roi')) {
      queries.push(
        RoiHistory.find(buildFilter('userId')).populate('userId', 'name userId email').lean()
          .then(docs => docs.map(d => ({ ...d, txType: 'roi', txAmount: d.roiEarned, txDate: d.createdAt }))),
      );
    }

    if (typesToFetch.includes('multilevel_reward')) {
      queries.push(
        MultiLevelReward.find(buildFilter('earnerId')).populate('earnerId', 'name userId email').populate('fromUserId', 'name userId email').lean()
          .then(docs => docs.map(d => ({ ...d, txType: 'multilevel_reward', txAmount: d.netAmount, txDate: d.createdAt, userId: d.earnerId }))),
      );
    }

    if (typesToFetch.includes('rank_reward')) {
      queries.push(
        RankReward.find(buildFilter('userId')).populate('userId', 'name userId email').lean()
          .then(docs => docs.map(d => ({ ...d, txType: 'rank_reward', txAmount: d.netAmount, txDate: d.createdAt }))),
      );
    }

    if (typesToFetch.includes('rank_bonus')) {
      queries.push(
        RankBonusReward.find(buildFilter('userId')).populate('userId', 'name userId email').lean()
          .then(docs => docs.map(d => ({ ...d, txType: 'rank_bonus', txAmount: d.netAmount, txDate: d.createdAt }))),
      );
    }

    const results = await Promise.all(queries);
    const all = results.flat().sort((a, b) => new Date(b.txDate).getTime() - new Date(a.txDate).getTime());

    const totalDocs = all.length;
    const totalPages = Math.ceil(totalDocs / limit);
    const transactions = all.slice(skip, skip + limit);

    return {
      transactions,
      pagination: { page, limit, totalDocs, totalPages, skip },
    };
  }

  async changeUserPassword(id: string, newPassword: string): Promise<void> {
    const user = await adminRepository.findUserById(id);
    if (!user) throw ApiError.notFound('User not found');
    if (user.role === 'admin') throw ApiError.forbidden('Cannot change admin password from here');
    const hashed = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(id, { password: hashed });
  }

  async changeUserEmail(id: string, newEmail: string): Promise<IUser | null> {
    const user = await adminRepository.findUserById(id);
    if (!user) throw ApiError.notFound('User not found');
    if (user.role === 'admin') throw ApiError.forbidden('Cannot change admin email from here');
    const existing = await User.findOne({ email: newEmail });
    if (existing) throw ApiError.conflict('Email already in use');
    return User.findByIdAndUpdate(id, { email: newEmail }, { new: true }).select('-password');
  }

  // 2FA
  async adminDisable2FA(id: string): Promise<void> {
    const user = await adminRepository.findUserById(id);
    if (!user) throw ApiError.notFound('User not found');
    if (!user.twoFactorEnabled) throw ApiError.conflict('2FA is not enabled for this user');
    await User.findByIdAndUpdate(id, { twoFactorEnabled: false, twoFactorSecret: null });
  }

  async getRoiDistributionHistory(query: { page?: string; limit?: string }) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const skip = (page - 1) * limit;

    const [distributions, totalDocs] = await Promise.all([
      RoiDistribution.find()
        .populate('distributedBy', 'name userId')
        .sort({ distributedAt: -1 })
        .skip(skip)
        .limit(limit),
      RoiDistribution.countDocuments(),
    ]);

    return {
      distributions,
      pagination: { page, limit, totalDocs, totalPages: Math.ceil(totalDocs / limit), skip },
    };
  }

  async getRecentSwpPurchases() {
    const purchases = await SwpPurchase.find()
      .populate('userId', 'name userId email')
      .sort({ createdAt: -1 })
      .limit(7)
      .lean();
    return purchases;
  }

  // Pool Config
  async getPoolConfig() {
    const config = await getPoolConfig();
    const lastDistribution = await PoolReward.aggregate([
      { $sort: { createdAt: -1 } },
      { $limit: 1 },
      { $group: { _id: '$createdAt', totalDistributed: { $sum: '$amount' } } },
    ]);

    return {
      percentage: config.percentage,
      lastDistributedAmount: lastDistribution[0]?.totalDistributed ?? 0,
      updatedAt: config.updatedAt,
    };
  }

  async previewPoolDistribution(percentage: number) {
    const systemFund = await getSystemFund();
    if (systemFund.poolFund <= 0) throw ApiError.badRequest('Pool fund is empty');

    const activeUsers = await User.find({ role: 'user', isBlocked: false, swpBalance: { $gt: 0 } }).select('swpBalance').lean();
    if (activeUsers.length === 0) throw ApiError.badRequest('No active users with SWP packages to distribute to');

    const totalRequired = activeUsers.reduce((sum, u) => {
      const gross = Math.round((u.swpBalance * percentage / 100) * 100) / 100;
      return sum + gross;
    }, 0);

    const sufficient = totalRequired <= systemFund.poolFund;

    return {
      percentage,
      poolFundBalance: systemFund.poolFund,
      totalDeduction: Math.round(totalRequired * 100) / 100,
      remainingBalance: Math.round((systemFund.poolFund - totalRequired) * 100) / 100,
      activeUsers: activeUsers.length,
      sufficient,
      message: sufficient
        ? `$${totalRequired.toFixed(2)} will be deducted from pool fund. Remaining: $${(systemFund.poolFund - totalRequired).toFixed(2)}.`
        : `Insufficient pool fund. Required: $${totalRequired.toFixed(2)}, Available: $${systemFund.poolFund.toFixed(2)}.`,
    };
  }

  async updatePoolConfig(percentage: number): Promise<any> {
    const systemFund = await getSystemFund();
    const activeUsers = await User.find({ role: 'user', isBlocked: false, swpBalance: { $gt: 0 } }).select('swpBalance').lean();

    if (activeUsers.length > 0) {
      const totalRequired = activeUsers.reduce((sum, u) => sum + Math.round((u.swpBalance * percentage / 100) * 100) / 100, 0);
      if (totalRequired > systemFund.poolFund) {
        throw ApiError.badRequest(
          `Insufficient pool fund. Required: $${totalRequired.toFixed(2)}, Available: $${systemFund.poolFund.toFixed(2)}.`,
        );
      }
    }

    const config = await getPoolConfig();
    config.percentage = percentage;
    await config.save();
    return config;
  }

  async distributePoolFund(_adminId: Types.ObjectId) {
    const poolConfig = await getPoolConfig();
    const percentage = poolConfig.percentage;

    const systemFund = await getSystemFund();
    if (systemFund.poolFund <= 0) throw ApiError.badRequest('Pool fund is empty');

    const activeUsers = await User.find({ role: 'user', isBlocked: false, swpBalance: { $gt: 0 } }).select('_id swpBalance totalPoolFundEarned').lean();
    if (activeUsers.length === 0) throw ApiError.badRequest('No active users with SWP packages to distribute to');

    // Each user gets percentage% of their swpBalance (with 5% cutoff), capped at swpBalance total
    const userRewards = activeUsers.map(u => {
      const alreadyEarned = u.totalPoolFundEarned ?? 0;
      const cap = u.swpBalance;
      const remaining = Math.max(cap - alreadyEarned, 0);

      if (remaining <= 0) return { _id: u._id, gross: 0, cutoff: 0, net: 0, capped: true };

      let gross = Math.round((u.swpBalance * percentage / 100) * 100) / 100;
      if (gross > remaining) gross = Math.round(remaining * 100) / 100;

      const { grossAmount, cutoffAmount, netAmount } = calculateCutoff(gross);
      return { _id: u._id, gross: grossAmount, cutoff: cutoffAmount, net: netAmount, capped: false };
    }).filter(u => u.gross > 0);

    const totalRequired = userRewards.reduce((sum, u) => sum + u.gross, 0);

    // Pre-check: ensure pool fund is sufficient
    if (totalRequired > systemFund.poolFund) {
      throw ApiError.badRequest(
        `Insufficient pool fund. Required: $${totalRequired.toFixed(2)}, Available: $${systemFund.poolFund.toFixed(2)}.`,
      );
    }

    // Distribute to each user (net amount after cutoff)
    const bulkOps = userRewards.map(u => ({
      updateOne: {
        filter: { _id: u._id },
        update: { $inc: { walletBalance: u.net, totalEarnings: u.net, totalGrossEarnings: u.gross, totalCutoffDeducted: u.cutoff, totalPoolFundEarned: u.gross } },
      },
    }));
    await User.bulkWrite(bulkOps);

    // Credit admin with total cutoff
    const totalCutoff = userRewards.reduce((sum, u) => sum + u.cutoff, 0);
    if (totalCutoff > 0) {
      await User.findOneAndUpdate({ role: 'admin' }, { $inc: { walletBalance: totalCutoff } });
    }

    // Create per-user pool reward records
    const rewardUsers = activeUsers.filter(u => userRewards.some(r => r._id.equals(u._id)));
    const poolRewardDocs = rewardUsers.map(u => {
      const reward = userRewards.find(r => r._id.equals(u._id))!;
      return {
        userId: u._id,
        amount: reward.gross,
        grossAmount: reward.gross,
        cutoffAmount: reward.cutoff,
        netAmount: reward.net,
        swpBalance: u.swpBalance,
        percentage,
      };
    });
    await PoolReward.insertMany(poolRewardDocs);

    await SystemFund.findOneAndUpdate({}, { $inc: { poolFund: -totalRequired } });

    return {
      poolFundBefore: systemFund.poolFund,
      poolFundAfter: Math.round((systemFund.poolFund - totalRequired) * 100) / 100,
      percentage,
      totalDistributed: Math.round(totalRequired * 100) / 100,
      activeUsers: activeUsers.length,
    };
  }

  async addUsdtToWallet(id: string, amount: number, adminId: Types.ObjectId) {
    const user = await adminRepository.findUserById(id);
    if (!user) throw ApiError.notFound('User not found');
    if (user.role === 'admin') throw ApiError.forbidden('Cannot add USDT to an admin');
    if (user.isBlocked) throw ApiError.forbidden('Cannot add USDT to a blocked user');

    const cutoffAmount = Math.round(amount * 0.05 * 100) / 100;
    const netAmount = Math.round((amount - cutoffAmount) * 100) / 100;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $inc: { walletBalance: netAmount } },
      { new: true },
    ).select('name userId email walletBalance');

    await SpecialReward.create({ userId: user._id, amount, grossAmount: amount, cutoffAmount, netAmount, grantedBy: adminId });
    await notifyEarning(user._id, 'special_rewards', netAmount);

    return { user: updatedUser, grossAmount: amount, cutoffAmount, netAmount };
  }

  async getUserJoinChart(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const agg = await User.aggregate([
      { $match: { role: { $ne: 'admin' }, createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const countMap: Record<string, number> = {};
    for (const entry of agg) countMap[entry._id] = entry.count;

    const dailyData = [];
    let totalJoined = 0;
    const cursor = new Date(startDate);

    for (let i = 0; i < days; i++) {
      const dateStr = cursor.toISOString().split('T')[0];
      const count = countMap[dateStr] || 0;
      totalJoined += count;
      dailyData.push({ date: dateStr, count });
      cursor.setDate(cursor.getDate() + 1);
    }

    return { days, totalJoined, dailyData };
  }
}

export default new AdminService();
