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
    ]);

    return {
      totalUsers: { total: totalUsers, today: todayUsers },
      totalSwpPurchased: { total: swpAgg[0]?.total ?? 0, today: swpTodayAgg[0]?.total ?? 0 },
      totalInvested: { total: investAgg[0]?.total ?? 0, today: investTodayAgg[0]?.total ?? 0 },
      totalLevelIncome: { total: commissionAgg[0]?.total ?? 0, today: commissionTodayAgg[0]?.total ?? 0 },
      totalRoiDistributed: { total: roiAgg[0]?.total ?? 0, today: roiTodayAgg[0]?.total ?? 0 },
      totalMultiLevelReward: { total: mlrAgg[0]?.total ?? 0, today: mlrTodayAgg[0]?.total ?? 0 },
      totalRankIncome: { total: rankAgg[0]?.total ?? 0, today: rankTodayAgg[0]?.total ?? 0 },
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

  async getRoiConfig(): Promise<IRoiConfig> {
    return this.getOrCreateRoiConfig();
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
