import { Types } from 'mongoose';
import ApiError from '../../utils/ApiError';
import { buildPagination } from '../../utils/helpers';
import userRepository from './user.repository';
import User from '../../models/User';
import Network from '../../models/Network';
import Commission from '../../models/Commission';
import RoiHistory from '../../models/RoiHistory';
import MultiLevelReward from '../../models/MultiLevelReward';
import RankReward from '../../models/RankReward';
import RankBonusReward from '../../models/RankBonusReward';
import { IUser, Pagination, PaginationQuery } from '../../types';
import { sendReferralEmail } from '../../utils/email';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

class UserService {
  async getProfile(userId: Types.ObjectId): Promise<IUser> {
    const user = await userRepository.findById(userId);
    if (!user) throw ApiError.notFound('User not found');
    return user;
  }

  async updateProfile(userId: Types.ObjectId, updateData: { name?: string }): Promise<IUser> {
    const allowedFields: Record<string, unknown> = {};
    if (updateData.name !== undefined) allowedFields.name = updateData.name;

    if (Object.keys(allowedFields).length === 0) {
      throw ApiError.badRequest('No valid fields to update');
    }

    const user = await userRepository.findByIdAndUpdate(userId, allowedFields);
    if (!user) throw ApiError.notFound('User not found');
    return user;
  }

  async getUserByUserId(userId: string): Promise<Pick<IUser, '_id' | 'name' | 'userId' | 'createdAt'>> {
    const user = await userRepository.findByUserId(userId);
    if (!user) throw ApiError.notFound('User not found');
    return {
      _id: user._id,
      name: user.name,
      userId: user.userId,
      createdAt: user.createdAt,
    };
  }

  async getDashboard(userObjectId: Types.ObjectId) {
    const user = await User.findById(userObjectId).select(
      'walletBalance swpBalance totalSwpVolume userId',
    );
    if (!user) throw ApiError.notFound('User not found');

    const [
      directReferrals,
      totalDownline,
      currentRank,
      commissionAgg,
      roiAgg,
      mlrAgg,
      rankRewardAgg,
      rankBonusAgg,
    ] = await Promise.all([
      User.countDocuments({ sponsorId: user.userId }),
      this.countDownline(userObjectId),
      this.getCurrentRank(userObjectId),
      Commission.aggregate([
        { $match: { earnerId: userObjectId } },
        { $group: { _id: null, gross: { $sum: '$grossAmount' }, cutoff: { $sum: '$cutoffAmount' }, net: { $sum: '$netAmount' } } },
      ]),
      RoiHistory.aggregate([
        { $match: { userId: userObjectId } },
        { $group: { _id: null, gross: { $sum: '$roiEarned' } } },
      ]),
      MultiLevelReward.aggregate([
        { $match: { earnerId: userObjectId } },
        { $group: { _id: null, gross: { $sum: '$grossAmount' }, cutoff: { $sum: '$cutoffAmount' }, net: { $sum: '$netAmount' } } },
      ]),
      RankReward.aggregate([
        { $match: { userId: userObjectId } },
        { $group: { _id: null, gross: { $sum: '$grossAmount' }, cutoff: { $sum: '$cutoffAmount' }, net: { $sum: '$netAmount' } } },
      ]),
      RankBonusReward.aggregate([
        { $match: { userId: userObjectId } },
        { $group: { _id: null, gross: { $sum: '$grossAmount' }, cutoff: { $sum: '$cutoffAmount' }, net: { $sum: '$netAmount' } } },
      ]),
    ]);

    const roi = { gross: roiAgg[0]?.gross ?? 0, cutoff: 0, net: roiAgg[0]?.gross ?? 0 };
    const commissions = { gross: commissionAgg[0]?.gross ?? 0, cutoff: commissionAgg[0]?.cutoff ?? 0, net: commissionAgg[0]?.net ?? 0 };
    const multiLevelRewards = { gross: mlrAgg[0]?.gross ?? 0, cutoff: mlrAgg[0]?.cutoff ?? 0, net: mlrAgg[0]?.net ?? 0 };
    const rankRewards = { gross: rankRewardAgg[0]?.gross ?? 0, cutoff: rankRewardAgg[0]?.cutoff ?? 0, net: rankRewardAgg[0]?.net ?? 0 };
    const rankBonus = { gross: rankBonusAgg[0]?.gross ?? 0, cutoff: rankBonusAgg[0]?.cutoff ?? 0, net: rankBonusAgg[0]?.net ?? 0 };

    const totalGross = roi.gross + commissions.gross + multiLevelRewards.gross + rankRewards.gross + rankBonus.gross;
    const totalCutoff = commissions.cutoff + multiLevelRewards.cutoff + rankRewards.cutoff + rankBonus.cutoff;
    const totalNet = roi.net + commissions.net + multiLevelRewards.net + rankRewards.net + rankBonus.net;

    return {
      walletBalance: user.walletBalance,
      currentRank,
      totalDirectReferrals: directReferrals,
      totalDownline,
      totalSwpPurchased: user.swpBalance,
      totalTeamSwpVolume: user.totalSwpVolume,
      earnings: {
        summary: {
          totalGrossEarnings: Math.round(totalGross * 100) / 100,
          totalCutoffDeducted: Math.round(totalCutoff * 100) / 100,
          totalNetEarnings: Math.round(totalNet * 100) / 100,
        },
        breakdown: { roi, commissions, multiLevelRewards, rankRewards, rankBonus },
      },
    };
  }

  private async countDownline(userObjectId: Types.ObjectId): Promise<number> {
    const children = await Network.find({ parentId: userObjectId }).select('userId');
    if (children.length === 0) return 0;
    const counts = await Promise.all(children.map((c) => this.countDownline(c.userId)));
    return children.length + counts.reduce((sum, c) => sum + c, 0);
  }

  private async getCurrentRank(userObjectId: Types.ObjectId): Promise<string | null> {
    const lastReward = await RankReward.findOne({ userId: userObjectId })
      .sort({ createdAt: -1 })
      .populate('rankConfigId', 'order name')
      .lean();
    if (!lastReward?.rankConfigId) return null;
    const config = lastReward.rankConfigId as unknown as { name: string };
    return config.name ?? null;
  }

  async getDirectReferrals(userObjectId: Types.ObjectId) {
    const user = await User.findById(userObjectId).select('userId');
    if (!user) throw ApiError.notFound('User not found');

    return User.find({ sponsorId: user.userId })
      .select('name userId email swpBalance totalInvested isBlocked createdAt')
      .sort({ createdAt: -1 })
      .lean();
  }

  async getIncomeChart(userObjectId: Types.ObjectId, query: { month?: number; year?: number }) {
    const now = new Date();
    const month = query.month || now.getMonth() + 1;
    const year = query.year || now.getFullYear();

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    const daysInMonth = endDate.getDate();

    const dateMatch = { $gte: startDate, $lte: endDate };

    const [roiAgg, mlrAgg, commissionAgg, rankRewardAgg] = await Promise.all([
      RoiHistory.aggregate([
        { $match: { userId: userObjectId, createdAt: dateMatch } },
        { $group: { _id: { $dayOfMonth: '$createdAt' }, value: { $sum: '$roiEarned' } } },
      ]),
      MultiLevelReward.aggregate([
        { $match: { earnerId: userObjectId, createdAt: dateMatch } },
        { $group: { _id: { $dayOfMonth: '$createdAt' }, value: { $sum: '$netAmount' } } },
      ]),
      Commission.aggregate([
        { $match: { earnerId: userObjectId, createdAt: dateMatch } },
        { $group: { _id: { $dayOfMonth: '$createdAt' }, value: { $sum: '$netAmount' } } },
      ]),
      RankReward.aggregate([
        { $match: { userId: userObjectId, createdAt: dateMatch } },
        { $group: { _id: { $dayOfMonth: '$createdAt' }, value: { $sum: '$netAmount' } } },
      ]),
    ]);

    // Merge all sources into a day map
    const dayMap: Record<number, number> = {};
    for (let d = 1; d <= daysInMonth; d++) dayMap[d] = 0;

    for (const agg of [roiAgg, mlrAgg, commissionAgg, rankRewardAgg]) {
      for (const entry of agg) {
        dayMap[entry._id] = (dayMap[entry._id] || 0) + entry.value;
      }
    }

    let totalRevenue = 0;
    const dailyRevenue = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const value = Math.round((dayMap[d] || 0) * 100) / 100;
      totalRevenue += value;
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dailyRevenue.push({ day: d, date: dateStr, value });
    }

    return {
      month,
      monthName: MONTH_NAMES[month - 1],
      year,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      dailyRevenue,
    };
  }

  async getUsers(query: PaginationQuery): Promise<{ users: IUser[]; pagination: Pagination }> {
    const filter = {};
    const totalDocs = await userRepository.countDocuments(filter);
    const pagination = buildPagination(query, totalDocs);

    const users = await userRepository.findAll(filter, {
      skip: pagination.skip,
      limit: pagination.limit,
    });

    return { users, pagination };
  }

  async sendReferralInvite(userObjectId: Types.ObjectId, email: string, referralLink: string): Promise<{ message: string; email: string }> {
    const user = await User.findById(userObjectId).select('name userId email');
    if (!user) throw ApiError.notFound('User not found');

    if (email.toLowerCase() === user.email.toLowerCase()) {
      throw ApiError.badRequest('You cannot send a referral to yourself');
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) throw ApiError.conflict('This email is already registered');

    await sendReferralEmail(email, user.name, referralLink);

    return {
      message: `Referral invite sent to ${email}`,
      email,
    };
  }
}

export default new UserService();
