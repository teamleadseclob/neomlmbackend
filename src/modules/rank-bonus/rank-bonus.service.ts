import { Types } from 'mongoose';
import RankBonusConfig from '../../models/RankBonusConfig';
import RankBonusDistribution from '../../models/RankBonusDistribution';
import RankConfig from '../../models/RankConfig';
import RankReward from '../../models/RankReward';
import { creditWithCutoff, calculateCutoff } from '../../utils/cutoff';
import RankBonusReward from '../../models/RankBonusReward';
import { getRankBonusAmountConfig, IRankBonusAmountConfig } from '../../models/RankBonusAmountConfig';
import ApiError from '../../utils/ApiError';
import logger from '../../config/logger';
import { notifyEarning } from '../../utils/notifyEarning';

class RankBonusService {
  async distribute(adminId: Types.ObjectId) {
    const amountConfig = await getRankBonusAmountConfig();
    const amount = amountConfig.amount;
    const configs = await RankBonusConfig.find().sort({ rankOrder: -1 }).lean();
    if (configs.length === 0) throw ApiError.badRequest('No rank bonus configs found');

    const rankOrders = configs.map((c) => c.rankOrder);
    const ranks = await RankConfig.find({ order: { $in: rankOrders }, isActive: true }).lean();
    const rankMap = new Map(ranks.map((r) => [r.order, r]));

    const distribution = await RankBonusDistribution.create({
      amount,
      distributedBy: adminId,
      breakdown: [],
      totalDistributed: 0,
    });

    const breakdown: IRankBonusDistribution['breakdown'] = [];
    let totalDistributed = 0;
    const processedUserIds = new Set<string>();

    for (const config of configs) {
      const rank = rankMap.get(config.rankOrder);
      if (!rank) continue;

      // Find all users who achieved this rank, exclude those already processed at a higher rank
      const rewards = await RankReward.find({ rankConfigId: rank._id }).select('userId').lean();
      const userIds = [...new Set(rewards.map((r) => r.userId.toString()))]
        .filter(uid => !processedUserIds.has(uid));

      if (userIds.length === 0) {
        breakdown.push({
          rankOrder: config.rankOrder,
          rankName: rank.name,
          percentage: config.percentage,
          perUserAmount: 0,
          userCount: 0,
          totalDistributed: 0,
        });
        continue;
      }

      // Mark these users as processed so they don't get lower rank rewards
      userIds.forEach(uid => processedUserIds.add(uid));

      const perUserAmount = Math.round((amount * config.percentage) / 100 * 100) / 100;
      const cutoffInfo = calculateCutoff(perUserAmount);

      // Credit each user and create per-user reward log
      for (const userId of userIds) {
        await creditWithCutoff(new Types.ObjectId(userId), perUserAmount);
        await RankBonusReward.create({
          userId: new Types.ObjectId(userId),
          distributionId: distribution._id,
          rankOrder: config.rankOrder,
          rankName: rank.name,
          grossAmount: cutoffInfo.grossAmount,
          cutoffAmount: cutoffInfo.cutoffAmount,
          netAmount: cutoffInfo.netAmount,
        });
        await notifyEarning(userId as any, 'royalty_rewards', cutoffInfo.netAmount, rank.name);
      }

      const rankTotal = Math.round(perUserAmount * userIds.length * 100) / 100;
      totalDistributed += rankTotal;

      breakdown.push({
        rankOrder: config.rankOrder,
        rankName: rank.name,
        percentage: config.percentage,
        perUserAmount,
        userCount: userIds.length,
        totalDistributed: rankTotal,
      });

      logger.info(
        { rankName: rank.name, userCount: userIds.length, perUserAmount },
        'Rank bonus distributed',
      );
    }

    // Update distribution with final breakdown and total
    distribution.breakdown = breakdown;
    distribution.totalDistributed = totalDistributed;
    await distribution.save();

    return distribution;
  }

  async getHistory(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [docs, totalDocs] = await Promise.all([
      RankBonusDistribution.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      RankBonusDistribution.countDocuments(),
    ]);
    return {
      docs,
      pagination: { page, limit, totalDocs, totalPages: Math.ceil(totalDocs / limit) },
    };
  }

  async getConfig() {
    return RankBonusConfig.find().sort({ rankOrder: 1 }).lean();
  }

  async updateConfig(rankOrder: number, percentage: number) {
    const config = await RankBonusConfig.findOneAndUpdate(
      { rankOrder },
      { percentage },
      { new: true },
    );
    if (!config) throw ApiError.notFound(`Config for rank order ${rankOrder} not found`);
    return config;
  }
  async getAmountConfig() {
    const config = await getRankBonusAmountConfig();
    const lastDistribution = await RankBonusDistribution.findOne().sort({ createdAt: -1 }).select('totalDistributed createdAt').lean();

    return {
      amount: config.amount,
      lastDistributedAmount: lastDistribution?.totalDistributed ?? 0,
      lastDistributedAt: lastDistribution?.createdAt ?? null,
      updatedAt: config.updatedAt,
    };
  }

  async updateAmountConfig(amount: number): Promise<IRankBonusAmountConfig> {
    const config = await getRankBonusAmountConfig();
    config.amount = amount;
    await config.save();
    return config;
  }
}

// Import type for breakdown typing
import { IRankBonusDistribution } from '../../types';

export default new RankBonusService();
