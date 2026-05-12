import { Types } from 'mongoose';
import ApiError from '../../utils/ApiError';
import User from '../../models/User';
import Network from '../../models/Network';
import SwpPurchase, { ALLOWED_SWP_AMOUNTS, MAX_SWP_CAP, SWP_MULTIPLIER, getInvestmentLimit } from '../../models/SwpPurchase';
import LevelCommission from '../../models/LevelCommission';
import Commission from '../../models/Commission';
import TeamStats from '../../models/TeamStats';
import rankService from '../rank/rank.service';
import { creditWithCutoff, calculateCutoff } from '../../utils/cutoff';
import { creditFunds } from '../../models/SystemFund';

class SwpService {
  async purchase(userId: Types.ObjectId, amount: number) {
    if (!ALLOWED_SWP_AMOUNTS.includes(amount)) {
      throw ApiError.badRequest(`Amount must be one of: $${ALLOWED_SWP_AMOUNTS.join(', $')}`);
    }

    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found');

    const swpBefore = user.swpBalance;
    const swpAfter = swpBefore + amount;

    if (swpAfter > MAX_SWP_CAP) {
      const canBuy = MAX_SWP_CAP - swpBefore;
      throw ApiError.badRequest(
        canBuy > 0
          ? `SWP cap is $${MAX_SWP_CAP}. You can purchase up to $${canBuy} more.`
          : `SWP cap of $${MAX_SWP_CAP} already reached.`,
      );
    }

    const newLimit = getInvestmentLimit(swpAfter);

    user.swpBalance = swpAfter;
    user.maxInvestmentLimit = newLimit;
    await user.save();

    const purchase = await SwpPurchase.create({
      userId: user._id,
      amount,
      swpBefore,
      swpAfter,
    });

    // Credit system funds (pool 2%, management 3%, operation 5%)
    await creditFunds(amount);

    // Distribute commissions to upline
    await this.distributeCommissions(user._id, purchase._id, amount);

    // Propagate SWP volume up the sponsor chain and evaluate ranks
    const affectedAncestors = await this.propagateSwpVolume(user._id, amount);

    // Evaluate rank for each ancestor whose volume changed
    for (const ancestorId of affectedAncestors) {
      await rankService.evaluateRank(ancestorId);
    }

    return {
      swpBalance: swpAfter,
      maxInvestmentLimit: newLimit,
      totalInvested: user.totalInvested,
      remainingInvestment: newLimit - user.totalInvested,
      purchase: {
        _id: purchase._id,
        amount,
        swpBefore,
        swpAfter,
      },
    };
  }

  /**
   * Walk up the sponsor chain from the buyer.
   * For each ancestor, find which of their direct referrals this buyer falls under,
   * then upsert that TeamStats record and increment the ancestor's totalSwpVolume.
   */
  private async propagateSwpVolume(
    buyerObjectId: Types.ObjectId,
    amount: number,
  ): Promise<Types.ObjectId[]> {
    // Build the sponsor chain from buyer upward: [buyer, parent, grandparent, ...]
    const chain: Types.ObjectId[] = [buyerObjectId];
    let currentUserId = buyerObjectId;

    while (true) {
      const sponsor = await this.getSponsor(currentUserId);
      if (!sponsor) break;
      chain.push(sponsor);
      currentUserId = sponsor;
    }

    // For each ancestor (skip index 0 which is the buyer themselves),
    // the "referralId" is the next node down in the chain (the direct referral branch head).
    // chain = [buyer, parent, grandparent, great-grandparent]
    // For parent:        referralId = buyer       (if buyer is a direct referral of parent)
    // For grandparent:   referralId = parent      (parent is the direct referral of grandparent)
    // For great-grandparent: referralId = grandparent

    // But we need the DIRECT referral of each ancestor, not the immediate child in chain.
    // chain[i] is sponsored by chain[i+1]. So for ancestor at chain[i],
    // the direct referral branch head = chain[i-1] only if chain[i-1] is a direct referral.
    // Actually, the direct referral of chain[i] that leads to the buyer is chain[i-1]
    // only when chain[i-1]'s sponsor is chain[i]. But chain is built by walking sponsorId,
    // so chain[i]'s sponsor IS chain[i+1]. That means chain[i] is a direct referral of chain[i+1].
    // So for ancestor chain[j] (j >= 1), the direct referral branch = chain[j-1].
    // But chain[j-1] might not be a DIRECT referral of chain[j] — it IS, because
    // chain[j-1]'s sponsorId = chain[j].
    // Wait — no. chain is: buyer -> buyer's sponsor -> buyer's sponsor's sponsor -> ...
    // So chain[0].sponsorId = chain[1], chain[1].sponsorId = chain[2], etc.
    // That means chain[0] IS a direct referral of chain[1].
    // chain[1] IS a direct referral of chain[2]. And so on.
    // So for ancestor chain[j], the direct referral that leads down to the buyer = chain[j-1].
    // But for chain[2] (grandparent), the direct referral is chain[1] (parent), NOT the buyer.
    // That's correct — the buyer falls under chain[1]'s team from grandparent's perspective.

    const affectedAncestors: Types.ObjectId[] = [];

    for (let j = 1; j < chain.length; j++) {
      const ancestorId = chain[j];
      const directReferralId = chain[j - 1];

      // Find the actual direct referral of this ancestor that leads to the buyer.
      // Since chain[j-1].sponsorId = chain[j], chain[j-1] is direct referral of chain[j].
      // But for grandparent (chain[2]), the direct referral branch is chain[1] (parent),
      // not chain[0] (buyer). We need the direct child of ancestor in the chain.
      // That's already chain[j-1] only if chain[j-1]'s sponsor is chain[j].
      // But chain[j-1]'s sponsor is chain[j] by construction. However, for j=2,
      // chain[j-1] = chain[1] whose sponsor is chain[2] = ancestor. Correct.
      // For j=1, chain[j-1] = chain[0] = buyer, whose sponsor is chain[1] = ancestor. Correct.
      // So the direct referral of ancestor that the buyer falls under is:
      // - For j=1 (parent): chain[0] = buyer (buyer is direct referral of parent)
      // - For j=2 (grandparent): chain[1] = parent (parent is direct referral of grandparent)
      // This is correct!

      await TeamStats.findOneAndUpdate(
        { ownerId: ancestorId, referralId: directReferralId },
        { $inc: { teamSwpVolume: amount } },
        { upsert: true },
      );

      await User.findByIdAndUpdate(ancestorId, {
        $inc: { totalSwpVolume: amount },
      });

      affectedAncestors.push(ancestorId);
    }

    return affectedAncestors;
  }

  /**
   * Get the sponsor (parent) ObjectId for a given user ObjectId.
   * Uses the sponsorId field on User which stores the userId string of the sponsor.
   */
  private async getSponsor(userObjectId: Types.ObjectId): Promise<Types.ObjectId | null> {
    const user = await User.findById(userObjectId).select('sponsorId');
    if (!user || !user.sponsorId) return null;

    const sponsor = await User.findOne({ userId: user.sponsorId }).select('_id');
    return sponsor?._id ?? null;
  }

  private async distributeCommissions(
    buyerObjectId: Types.ObjectId,
    purchaseId: Types.ObjectId,
    purchaseAmount: number,
  ): Promise<void> {
    const levelConfigs = await LevelCommission.find({ isActive: true }).sort({ level: 1 });
    if (levelConfigs.length === 0) return;

    let currentNode = await Network.findOne({ userId: buyerObjectId });
    let currentLevel = 1;

    while (currentNode?.parentId && currentLevel <= 10) {
      const config = levelConfigs.find((c) => c.level === currentLevel);
      if (!config) {
        currentLevel++;
        currentNode = await Network.findOne({ userId: currentNode.parentId });
        continue;
      }

      // Skip if earner has no SWP package
      const earner = await User.findById(currentNode.parentId).select('swpBalance');
      if (!earner || earner.swpBalance <= 0) {
        currentNode = await Network.findOne({ userId: currentNode.parentId });
        currentLevel++;
        continue;
      }

      const commissionAmount = (purchaseAmount * config.percentage) / 100;
      const { grossAmount, cutoffAmount, netAmount } = calculateCutoff(commissionAmount);

      await Commission.create({
        earnerId: currentNode.parentId,
        fromUserId: buyerObjectId,
        swpPurchaseId: purchaseId,
        level: currentLevel,
        type: currentLevel === 1 ? 'referral' : 'level',
        percentage: config.percentage,
        amount: commissionAmount,
        grossAmount,
        cutoffAmount,
        netAmount,
      });

      await creditWithCutoff(currentNode.parentId, commissionAmount);

      currentNode = await Network.findOne({ userId: currentNode.parentId });
      currentLevel++;
    }
  }

  async getUserSwpStatus(userId: Types.ObjectId) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found');

    const remaining = user.maxInvestmentLimit - user.totalInvested;
    const needsRepurchase = remaining <= 0 && user.swpBalance > 0;
    const swpRemaining = MAX_SWP_CAP - user.swpBalance;

    return {
      swpBalance: user.swpBalance,
      swpCap: MAX_SWP_CAP,
      swpRemaining: Math.max(swpRemaining, 0),
      maxInvestmentLimit: user.maxInvestmentLimit,
      totalInvested: user.totalInvested,
      remainingInvestment: Math.max(remaining, 0),
      needsRepurchase,
    };
  }

  async getTeamStats(userId: Types.ObjectId) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found');

    const teams = await TeamStats.find({ ownerId: user._id })
      .populate('referralId', 'name userId')
      .sort({ teamSwpVolume: -1 });

    return {
      totalSwpVolume: user.totalSwpVolume,
      totalTeams: teams.length,
      teams: teams.map((t) => ({
        referralId: t.referralId,
        teamSwpVolume: t.teamSwpVolume,
      })),
    };
  }

  async getPackages(userId: Types.ObjectId) {
    const [lastPurchase, user] = await Promise.all([
      SwpPurchase.findOne({ userId }).sort({ createdAt: -1 }).lean(),
      User.findById(userId).select('swpBalance maxInvestmentLimit totalInvested').lean(),
    ]);

    return {
      packages: ALLOWED_SWP_AMOUNTS.map((amount) => ({
        amount,
        investmentLimit: amount * SWP_MULTIPLIER,
      })),
      swpCap: MAX_SWP_CAP,
      lastPurchased: lastPurchase?.amount ?? null,
      totalSwpPurchased: user?.swpBalance ?? 0,
      maxInvestmentLimit: user?.maxInvestmentLimit ?? 0,
      totalInvested: user?.totalInvested ?? 0,
    };
  }

  async getPurchaseHistory(userId: Types.ObjectId) {
    return SwpPurchase.find({ userId }).sort({ createdAt: -1 });
  }

  async getCommissionHistory(userId: Types.ObjectId, query: { page?: number; limit?: number }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter = { earnerId: userId };

    const [commissions, totalDocs, totalsAgg] = await Promise.all([
      Commission.find(filter)
        .populate('fromUserId', 'name userId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Commission.countDocuments(filter),
      Commission.aggregate([
        { $match: { earnerId: userId } },
        {
          $group: {
            _id: null,
            totalGross: { $sum: { $ifNull: ['$grossAmount', '$amount'] } },
            totalCutoff: { $sum: { $ifNull: ['$cutoffAmount', 0] } },
            totalNet: { $sum: { $ifNull: ['$netAmount', '$amount'] } },
          },
        },
      ]),
    ]);

    const totals = totalsAgg[0] || { totalGross: 0, totalCutoff: 0, totalNet: 0 };

    return {
      totalGross: Math.round(totals.totalGross * 100) / 100,
      totalCutoff: Math.round(totals.totalCutoff * 100) / 100,
      totalNet: Math.round(totals.totalNet * 100) / 100,
      totalEntries: totalDocs,
      history: commissions,
      pagination: { page, limit, totalDocs, totalPages: Math.ceil(totalDocs / limit) },
    };
  }
}

export default new SwpService();
