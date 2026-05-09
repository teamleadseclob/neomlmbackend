import { Types } from 'mongoose';
import crypto from 'crypto';
import ApiError from '../../utils/ApiError';
import User from '../../models/User';
import Investment from '../../models/Investment';
import RoiConfig from '../../models/RoiConfig';
import RoiHistory from '../../models/RoiHistory';
import Network from '../../models/Network';
import RankReward from '../../models/RankReward';
import MultiLevelRewardConfig from '../../models/MultiLevelRewardConfig';
import MultiLevelReward from '../../models/MultiLevelReward';
import logger from '../../config/logger';
import { creditWithoutCutoff, creditWithCutoff, calculateCutoff } from '../../utils/cutoff';

const CAP_MULTIPLIER = 2; // 200% cap for both ROI and MLR

interface DistributionResult {
  batchId: string;
  totalUsersProcessed: number;
  totalUsersEarned: number;
  totalUsersSkipped: number;
  totalUsersCapped: number;
  totalRoiDistributed: number;
  totalMultiLevelRewardsDistributed: number;
  roiPercentage: number;
  distributedAt: Date;
}

interface UserRoiBreakdown {
  investmentId: Types.ObjectId;
  investmentAmount: number;
  daysActive: number;
  roiForInvestment: number;
}

class RoiService {
  async distributeAll(): Promise<DistributionResult> {
    const config = await RoiConfig.findOne({});
    if (!config) throw ApiError.badRequest('ROI config not found. Please set up ROI config first.');
    if (config.dailyRoiPercentage <= 0) throw ApiError.badRequest('Daily ROI percentage is 0. Update ROI config before distributing.');

    const batchId = crypto.randomUUID();
    const now = new Date();
    const dailyRate = config.dailyRoiPercentage / 100;

    const mlrConfigs = await MultiLevelRewardConfig.find({ isActive: true, percentage: { $gt: 0 } }).sort({ level: 1 });

    const usersWithInvestments = await User.find({
      totalInvested: { $gt: 0 },
      isBlocked: false,
    }).select('_id totalInvested totalRoiEarned totalMultiLevelEarned');

    let totalUsersProcessed = 0;
    let totalUsersEarned = 0;
    let totalUsersSkipped = 0;
    let totalUsersCapped = 0;
    let totalRoiDistributed = 0;
    let totalMultiLevelRewardsDistributed = 0;

    for (const user of usersWithInvestments) {
      totalUsersProcessed++;

      const roiCap = user.totalInvested * CAP_MULTIPLIER;
      const roiRemaining = roiCap - user.totalRoiEarned;

      // ROI cap reached → skip ROI + MLR for this user
      if (roiRemaining <= 0) {
        totalUsersSkipped++;
        continue;
      }

      const investments = await Investment.find({ userId: user._id });
      if (investments.length === 0) {
        totalUsersSkipped++;
        continue;
      }

      // Calculate ROI per investment
      let rawRoi = 0;
      let totalDaysWeighted = 0;
      const breakdowns: UserRoiBreakdown[] = [];

      for (const inv of investments) {
        const lastCredited = inv.lastRoiCreditedAt || inv.createdAt;
        const diffMs = now.getTime() - new Date(lastCredited).getTime();
        const daysActive = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (daysActive <= 0) continue;

        const roiForInv = inv.amount * dailyRate * daysActive;
        rawRoi += roiForInv;
        totalDaysWeighted += daysActive;

        breakdowns.push({
          investmentId: inv._id,
          investmentAmount: inv.amount,
          daysActive,
          roiForInvestment: Math.round(roiForInv * 100) / 100,
        });
      }

      if (rawRoi <= 0) {
        totalUsersSkipped++;
        continue;
      }

      // Apply ROI 2x cap
      let finalRoi = Math.round(rawRoi * 100) / 100;
      let roiCapped = false;
      let capApplied = 0;

      if (finalRoi > roiRemaining) {
        capApplied = Math.round((finalRoi - roiRemaining) * 100) / 100;
        finalRoi = Math.round(roiRemaining * 100) / 100;
        roiCapped = true;
        totalUsersCapped++;
      }

      const avgDays = breakdowns.length > 0
        ? Math.round(totalDaysWeighted / breakdowns.length)
        : 0;

      const totalRoiBefore = user.totalRoiEarned;
      const totalRoiAfter = Math.round((totalRoiBefore + finalRoi) * 100) / 100;

      // Credit ROI (NO cutoff)
      await creditWithoutCutoff(user._id, finalRoi, { totalRoiEarned: finalRoi });

      await Investment.updateMany(
        { userId: user._id },
        { $set: { lastRoiCreditedAt: now } },
      );

      const roiHistory = await RoiHistory.create({
        userId: user._id,
        roiConfigId: config._id,
        totalInvestedAmount: user.totalInvested,
        roiPercentage: config.dailyRoiPercentage,
        daysCalculated: avgDays,
        roiEarned: finalRoi,
        roiCapped,
        capApplied,
        totalRoiBefore,
        totalRoiAfter,
        distributionBatchId: batchId,
      });

      totalUsersEarned++;
      totalRoiDistributed += finalRoi;

      // Distribute multi-level rewards
      // Check: if ROI cap is NOW reached after this credit, skip MLR
      const roiCapReachedNow = totalRoiAfter >= roiCap;

      if (mlrConfigs.length > 0 && finalRoi > 0 && !roiCapReachedNow) {
        const mlrTotal = await this.distributeMultiLevelRewards(
          user._id,
          roiHistory._id,
          finalRoi,
          user.totalInvested,
          mlrConfigs,
          batchId,
        );
        totalMultiLevelRewardsDistributed += mlrTotal;
      }

      logger.info(
        {
          userId: user._id,
          batchId,
          rawRoi: Math.round(rawRoi * 100) / 100,
          finalRoi,
          roiCapped,
          investments: breakdowns.length,
        },
        'ROI distributed to user',
      );
    }

    totalRoiDistributed = Math.round(totalRoiDistributed * 100) / 100;
    totalMultiLevelRewardsDistributed = Math.round(totalMultiLevelRewardsDistributed * 100) / 100;

    logger.info(
      {
        batchId,
        totalUsersProcessed,
        totalUsersEarned,
        totalUsersSkipped,
        totalUsersCapped,
        totalRoiDistributed,
        totalMultiLevelRewardsDistributed,
      },
      'ROI + Multi-Level Rewards distribution completed',
    );

    return {
      batchId,
      totalUsersProcessed,
      totalUsersEarned,
      totalUsersSkipped,
      totalUsersCapped,
      totalRoiDistributed,
      totalMultiLevelRewardsDistributed,
      roiPercentage: config.dailyRoiPercentage,
      distributedAt: now,
    };
  }

  /**
   * Distribute multi-level rewards to upline.
   * Each earner has their own 2x MLR cap based on THEIR totalInvested.
   * Also skipped if earner's ROI cap is reached.
   */
  private async distributeMultiLevelRewards(
    userObjectId: Types.ObjectId,
    roiHistoryId: Types.ObjectId,
    roiAmount: number,
    _buyerTotalInvested: number,
    configs: InstanceType<typeof MultiLevelRewardConfig>[],
    batchId: string,
  ): Promise<number> {
    let totalDistributed = 0;
    let currentNode = await Network.findOne({ userId: userObjectId });
    let currentLevel = 1;

    while (currentNode?.parentId && currentLevel <= 20) {
      const config = configs.find((c) => c.level === currentLevel);

      if (!config) {
        currentNode = await Network.findOne({ userId: currentNode.parentId });
        currentLevel++;
        continue;
      }

      const earnerId = currentNode.parentId;

      // Load earner's data for cap checks
      const earner = await User.findById(earnerId).select('totalInvested totalRoiEarned totalMultiLevelEarned');

      if (!earner || earner.totalInvested <= 0) {
        currentNode = await Network.findOne({ userId: earnerId });
        currentLevel++;
        continue;
      }

      const earnerRoiCap = earner.totalInvested * CAP_MULTIPLIER;
      const earnerMlrCap = earner.totalInvested * CAP_MULTIPLIER;

      // Rule 1: If earner's ROI cap reached → no MLR
      if (earner.totalRoiEarned >= earnerRoiCap) {
        currentNode = await Network.findOne({ userId: earnerId });
        currentLevel++;
        continue;
      }

      // Rule 2: If earner's MLR cap reached → no MLR
      const mlrRemaining = earnerMlrCap - earner.totalMultiLevelEarned;
      if (mlrRemaining <= 0) {
        currentNode = await Network.findOne({ userId: earnerId });
        currentLevel++;
        continue;
      }

      // Check rank requirement
      const earnerRankOrder = await this.getUserHighestRankOrder(earnerId);

      if (earnerRankOrder >= config.requiredRankOrder) {
        let rewardAmount = Math.round((roiAmount * config.percentage / 100) * 100) / 100;

        // Apply MLR 2x cap
        if (rewardAmount > mlrRemaining) {
          rewardAmount = Math.round(mlrRemaining * 100) / 100;
        }

        if (rewardAmount > 0) {
          const { grossAmount, cutoffAmount, netAmount } = calculateCutoff(rewardAmount);

          await MultiLevelReward.create({
            earnerId,
            fromUserId: userObjectId,
            roiHistoryId,
            level: currentLevel,
            percentage: config.percentage,
            roiAmount,
            rewardAmount,
            grossAmount,
            cutoffAmount,
            netAmount,
            requiredRankOrder: config.requiredRankOrder,
            earnerRankOrder,
            distributionBatchId: batchId,
          });

          await creditWithCutoff(earnerId, rewardAmount, { totalMultiLevelEarned: rewardAmount });

          totalDistributed += rewardAmount;
        }
      }

      currentNode = await Network.findOne({ userId: earnerId });
      currentLevel++;
    }

    return totalDistributed;
  }

  private async getUserHighestRankOrder(userId: Types.ObjectId): Promise<number> {
    const highestReward = await RankReward.findOne({ userId })
      .sort({ createdAt: -1 })
      .populate('rankConfigId', 'order')
      .lean();

    if (!highestReward || !highestReward.rankConfigId) return 0;

    const rankConfig = highestReward.rankConfigId as unknown as { order: number };
    return rankConfig.order ?? 0;
  }

  async getUserRoiHistory(userId: Types.ObjectId, query: { page?: number; limit?: number }) {
    const user = await User.findById(userId).select('totalInvested totalRoiEarned totalMultiLevelEarned');
    if (!user) throw ApiError.notFound('User not found');

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const cap = user.totalInvested * CAP_MULTIPLIER;

    const [history, totalDocs, totalsAgg] = await Promise.all([
      RoiHistory.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      RoiHistory.countDocuments({ userId }),
      RoiHistory.aggregate([
        { $match: { userId } },
        { $group: { _id: null, totalGross: { $sum: '$roiEarned' } } },
      ]),
    ]);

    const totalGross = totalsAgg[0]?.totalGross ?? 0;

    return {
      totalGross: Math.round(totalGross * 100) / 100,
      totalCutoff: 0,
      totalNet: Math.round(totalGross * 100) / 100,
      totalInvested: user.totalInvested,
      roiCap: cap,
      roiRemaining: Math.round(Math.max(cap - user.totalRoiEarned, 0) * 100) / 100,
      isRoiCapReached: user.totalRoiEarned >= cap,
      totalEntries: totalDocs,
      history,
      pagination: { page, limit, totalDocs, totalPages: Math.ceil(totalDocs / limit) },
    };
  }

  async getCombinedHistory(userId: Types.ObjectId, query: { page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const [roiDocs, mlrDocs] = await Promise.all([
      RoiHistory.find({ userId }).sort({ createdAt: -1 }).lean(),
      MultiLevelReward.find({ earnerId: userId })
        .populate('fromUserId', 'name userId')
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const roiEntries = roiDocs.map((r) => ({
      type: 'roi' as const,
      grossAmount: r.roiEarned,
      cutoffAmount: 0,
      netAmount: r.roiEarned,
      createdAt: r.createdAt,
      details: r,
    }));

    const mlrEntries = mlrDocs.map((m) => ({
      type: 'mlr' as const,
      grossAmount: m.grossAmount ?? m.rewardAmount,
      cutoffAmount: m.cutoffAmount ?? 0,
      netAmount: m.netAmount ?? m.rewardAmount,
      createdAt: m.createdAt,
      details: m,
    }));

    const combined = [...roiEntries, ...mlrEntries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const totalDocs = combined.length;
    const skip = (page - 1) * limit;
    const paginated = combined.slice(skip, skip + limit);

    const roiTotal = roiEntries.reduce((s, r) => s + r.grossAmount, 0);
    const mlrGross = mlrEntries.reduce((s, m) => s + m.grossAmount, 0);
    const mlrCutoff = mlrEntries.reduce((s, m) => s + m.cutoffAmount, 0);
    const mlrNet = mlrEntries.reduce((s, m) => s + m.netAmount, 0);

    return {
      summary: {
        roi: { totalGross: Math.round(roiTotal * 100) / 100, totalCutoff: 0, totalNet: Math.round(roiTotal * 100) / 100 },
        mlr: { totalGross: Math.round(mlrGross * 100) / 100, totalCutoff: Math.round(mlrCutoff * 100) / 100, totalNet: Math.round(mlrNet * 100) / 100 },
      },
      totalEntries: totalDocs,
      history: paginated,
      pagination: { page, limit, totalDocs, totalPages: Math.ceil(totalDocs / limit) },
    };
  }

  async getUserRoiStatus(userId: Types.ObjectId) {
    const user = await User.findById(userId).select('totalInvested totalRoiEarned totalMultiLevelEarned');
    if (!user) throw ApiError.notFound('User not found');

    const config = await RoiConfig.findOne({});
    const cap = user.totalInvested * CAP_MULTIPLIER;
    const roiRemaining = Math.max(cap - user.totalRoiEarned, 0);
    const mlrRemaining = Math.max(cap - user.totalMultiLevelEarned, 0);

    let pendingRoi = 0;
    if (config && config.dailyRoiPercentage > 0 && user.totalInvested > 0 && roiRemaining > 0) {
      const investments = await Investment.find({ userId });
      const now = new Date();
      const dailyRate = config.dailyRoiPercentage / 100;

      for (const inv of investments) {
        const lastCredited = inv.lastRoiCreditedAt || inv.createdAt;
        const diffMs = now.getTime() - new Date(lastCredited).getTime();
        const daysActive = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (daysActive > 0) {
          pendingRoi += inv.amount * dailyRate * daysActive;
        }
      }

      if (pendingRoi > roiRemaining) {
        pendingRoi = roiRemaining;
      }
    }

    return {
      totalInvested: user.totalInvested,
      roi: {
        totalEarned: user.totalRoiEarned,
        cap,
        remaining: Math.round(roiRemaining * 100) / 100,
        isCapReached: user.totalRoiEarned >= cap,
        pendingRoi: Math.round(pendingRoi * 100) / 100,
        dailyPercentage: config?.dailyRoiPercentage ?? 0,
      },
      multiLevelRewards: {
        totalEarned: user.totalMultiLevelEarned,
        cap,
        remaining: Math.round(mlrRemaining * 100) / 100,
        isCapReached: user.totalMultiLevelEarned >= cap,
      },
    };
  }
}

export default new RoiService();
