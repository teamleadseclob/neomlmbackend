import { Types } from 'mongoose';
import RankConfig from '../../models/RankConfig';
import RankReward from '../../models/RankReward';
import TeamStats from '../../models/TeamStats';
import User from '../../models/User';
import ApiError from '../../utils/ApiError';
import logger from '../../config/logger';
import { creditWithCutoff, calculateCutoff } from '../../utils/cutoff';
import { notifyEarning } from '../../utils/notifyEarning';

class RankService {
  /**
   * Evaluate and award ranks for a user after SWP volume changes.
   * Checks ranks sequentially (must achieve lower before higher).
   * Awards one-time reward per rank.
   */
  async evaluateRank(userObjectId: Types.ObjectId): Promise<void> {
    const ranks = await RankConfig.find({ isActive: true }).sort({ order: 1 });
    if (ranks.length === 0) return;

    const achievedRanks = await RankReward.find({ userId: userObjectId }).select('rankConfigId');
    const achievedSet = new Set(achievedRanks.map((r) => r.rankConfigId.toString()));

    const user = await User.findById(userObjectId).select('totalSwpVolume');
    if (!user) return;

    const teams = await TeamStats.find({ ownerId: userObjectId });

    for (const rank of ranks) {
      // Already achieved this rank
      if (achievedSet.has(rank._id.toString())) continue;

      // Sequential: previous rank must be achieved (skip for order 1)
      if (rank.order > 1) {
        const prevRank = ranks.find((r) => r.order === rank.order - 1);
        if (prevRank && !achievedSet.has(prevRank._id.toString())) break;
      }

      // Criteria 1: enough active teams
      const activeTeams = teams.filter((t) => t.teamSwpVolume > 0);
      if (activeTeams.length < rank.requiredTeams) break;

      // Criteria 2: raw total volume
      if (user.totalSwpVolume < rank.totalSwpVolume) break;

      // Criteria 3: capped volume
      const cappedVolume = teams.reduce(
        (sum, t) => sum + Math.min(t.teamSwpVolume, rank.maxVolPerTeam),
        0,
      );
      if (cappedVolume < rank.totalSwpVolume) break;

      // All criteria met — award rank
      const { grossAmount, cutoffAmount, netAmount } = calculateCutoff(rank.reward);

      await RankReward.create({
        userId: userObjectId,
        rankConfigId: rank._id,
        rankName: rank.name,
        reward: rank.reward,
        grossAmount,
        cutoffAmount,
        netAmount,
      });

      await creditWithCutoff(userObjectId, rank.reward);

      await notifyEarning(userObjectId, 'rank_income', netAmount, rank.name);

      achievedSet.add(rank._id.toString());

      logger.info(
        { userId: userObjectId, rank: rank.name, reward: rank.reward },
        'Rank achieved',
      );
    }
  }

  async getRankStatus(userObjectId: Types.ObjectId) {
    const user = await User.findById(userObjectId).select('totalSwpVolume userId name');
    if (!user) throw ApiError.notFound('User not found');

    const [ranks, achieved, teams] = await Promise.all([
      RankConfig.find({ isActive: true }).sort({ order: 1 }).lean(),
      RankReward.find({ userId: userObjectId }).lean(),
      TeamStats.find({ ownerId: userObjectId }).sort({ teamSwpVolume: -1 }).lean(),
    ]);

    const achievedSet = new Set(achieved.map((r) => r.rankConfigId.toString()));

    const currentRank = [...ranks].reverse().find((r) => achievedSet.has(r._id.toString()));

    const rankDetails = ranks.map((rank) => {
      const isAchieved = achievedSet.has(rank._id.toString());
      const activeTeams = teams.filter((t) => t.teamSwpVolume > 0).length;
      const cappedVolume = teams.reduce(
        (sum, t) => sum + Math.min(t.teamSwpVolume, rank.maxVolPerTeam),
        0,
      );

      return {
        name: rank.name,
        order: rank.order,
        reward: rank.reward,
        isAchieved,
        achievedAt: achieved.find((a) => a.rankConfigId.toString() === rank._id.toString())?.createdAt ?? null,
        criteria: {
          requiredTeams: { required: rank.requiredTeams, current: activeTeams, met: activeTeams >= rank.requiredTeams },
          totalSwpVolume: { required: rank.totalSwpVolume, current: user.totalSwpVolume, met: user.totalSwpVolume >= rank.totalSwpVolume },
          cappedVolume: { required: rank.totalSwpVolume, current: cappedVolume, met: cappedVolume >= rank.totalSwpVolume },
        },
      };
    });

    return {
      userId: user.userId,
      name: user.name,
      currentRank: currentRank?.name ?? null,
      ranks: rankDetails,
    };
  }
  async getRewardHistory(userObjectId: Types.ObjectId) {
    const rewards = await RankReward.find({ userId: userObjectId }).sort({ createdAt: -1 }).lean();

    const totalGross = rewards.reduce((sum, r) => sum + (r.grossAmount ?? r.reward), 0);
    const totalCutoff = rewards.reduce((sum, r) => sum + (r.cutoffAmount ?? 0), 0);
    const totalNet = rewards.reduce((sum, r) => sum + (r.netAmount ?? r.reward), 0);

    return {
      totalGross: Math.round(totalGross * 100) / 100,
      totalCutoff: Math.round(totalCutoff * 100) / 100,
      totalNet: Math.round(totalNet * 100) / 100,
      totalEntries: rewards.length,
      history: rewards,
    };
  }
}

export default new RankService();
