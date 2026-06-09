import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';
import Commission from '../../models/Commission';
import MultiLevelReward from '../../models/MultiLevelReward';
import RankReward from '../../models/RankReward';
import RankBonusReward from '../../models/RankBonusReward';
import SpecialReward from '../../models/SpecialReward';
import PoolReward from '../../models/PoolReward';
import SwpPurchase from '../../models/SwpPurchase';
import User from '../../models/User';
import { AuthRequest } from '../../types';

export const getRewardWallet = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user._id;

  const [referralAgg, layeredAgg, rankAgg, royaltyAgg, specialAgg, poolAgg] = await Promise.all([
    Commission.aggregate([
      { $match: { earnerId: userId, level: 1 } },
      { $group: { _id: null, total: { $sum: '$netAmount' } } },
    ]),
    Commission.aggregate([
      { $match: { earnerId: userId, level: { $gt: 1 } } },
      { $group: { _id: null, total: { $sum: '$netAmount' } } },
    ]).then(async (commResult) => {
      const mlrResult = await MultiLevelReward.aggregate([
        { $match: { earnerId: userId } },
        { $group: { _id: null, total: { $sum: '$netAmount' } } },
      ]);
      return (commResult[0]?.total ?? 0) + (mlrResult[0]?.total ?? 0);
    }),
    RankReward.aggregate([
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: '$netAmount' } } },
    ]),
    RankBonusReward.aggregate([
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: '$netAmount' } } },
    ]),
    SpecialReward.aggregate([
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: '$netAmount' } } },
    ]),
    PoolReward.aggregate([
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: '$netAmount' } } },
    ]),
  ]);

  const referralIncome = referralAgg[0]?.total ?? 0;
  const layeredRewards = typeof layeredAgg === 'number' ? layeredAgg : 0;
  const rankIncome = rankAgg[0]?.total ?? 0;
  const royaltyRewards = royaltyAgg[0]?.total ?? 0;
  const specialRewards = specialAgg[0]?.total ?? 0;
  const poolRewards = poolAgg[0]?.total ?? 0;

  const totalRewardWallet = referralIncome + layeredRewards + rankIncome + royaltyRewards + specialRewards + poolRewards;

  return ApiResponse.success(res, 'Reward wallet retrieved', {
    totalRewardWallet: Math.round(totalRewardWallet * 100) / 100,
    breakdown: {
      referralIncome: Math.round(referralIncome * 100) / 100,
      layeredRewards: Math.round(layeredRewards * 100) / 100,
      rankIncome: Math.round(rankIncome * 100) / 100,
      royaltyRewards: Math.round(royaltyRewards * 100) / 100,
      specialRewards: Math.round(specialRewards * 100) / 100,
      poolRewards: Math.round(poolRewards * 100) / 100,
    },
  });
});

export const getRewardWalletHistory = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user._id;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const type = req.query.type as string | undefined;

  const typesToFetch = type
    ? [type]
    : ['referral_income', 'layered_rewards', 'rank_income', 'royalty_rewards', 'special_rewards', 'pool_reward'];

  const queries: Promise<any[]>[] = [];

  if (typesToFetch.includes('referral_income')) {
    queries.push(
      Commission.find({ earnerId: userId, level: 1 })
        .populate('fromUserId', 'name userId')
        .lean()
        .then(docs => docs.map(d => ({
          type: 'referral_income',
          amount: d.netAmount,
          fromUser: d.fromUserId ? { _id: (d.fromUserId as any)._id, name: (d.fromUserId as any).name, userId: (d.fromUserId as any).userId } : null,
          detail: `From ${(d.fromUserId as any)?.name || 'User'}`,
          createdAt: d.createdAt,
        }))),
    );
  }

  if (typesToFetch.includes('layered_rewards')) {
    queries.push(
      Commission.find({ earnerId: userId, level: { $gt: 1 } })
        .populate('fromUserId', 'name userId')
        .lean()
        .then(docs => docs.map(d => ({
          type: 'layered_rewards',
          amount: d.netAmount,
          fromUser: d.fromUserId ? { _id: (d.fromUserId as any)._id, name: (d.fromUserId as any).name, userId: (d.fromUserId as any).userId } : null,
          detail: `Level ${d.level} from ${(d.fromUserId as any)?.name || 'User'}`,
          createdAt: d.createdAt,
        }))),
    );
    queries.push(
      MultiLevelReward.find({ earnerId: userId })
        .populate('fromUserId', 'name userId')
        .lean()
        .then(docs => docs.map(d => ({
          type: 'layered_rewards',
          amount: d.netAmount,
          fromUser: d.fromUserId ? { _id: (d.fromUserId as any)._id, name: (d.fromUserId as any).name, userId: (d.fromUserId as any).userId } : null,
          detail: `MLR Level ${d.level} from ${(d.fromUserId as any)?.name || 'User'}`,
          createdAt: d.createdAt,
        }))),
    );
  }

  if (typesToFetch.includes('rank_income')) {
    queries.push(
      RankReward.find({ userId }).lean()
        .then(docs => docs.map(d => ({
          type: 'rank_income',
          amount: d.netAmount,
          detail: d.rankName,
          createdAt: d.createdAt,
        }))),
    );
  }

  if (typesToFetch.includes('royalty_rewards')) {
    queries.push(
      RankBonusReward.find({ userId }).lean()
        .then(docs => docs.map(d => ({
          type: 'royalty_rewards',
          amount: d.netAmount,
          detail: d.rankName,
          createdAt: d.createdAt,
        }))),
    );
  }

  if (typesToFetch.includes('special_rewards')) {
    queries.push(
      SpecialReward.find({ userId }).lean()
        .then(docs => docs.map(d => ({
          type: 'special_rewards',
          amount: d.netAmount,
          detail: 'Admin grant',
          createdAt: d.createdAt,
        }))),
    );
  }

  if (typesToFetch.includes('pool_reward')) {
    queries.push(
      PoolReward.find({ userId }).lean()
        .then(docs => docs.map(d => ({
          type: 'pool_reward',
          amount: d.netAmount,
          detail: `Pool distribution (${d.percentage}% rate on ${d.swpBalance} SWP)`,
          createdAt: d.createdAt,
        }))),
    );
  }

  const results = await Promise.all(queries);
  const all = results.flat().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalDocs = all.length;
  const totalPages = Math.ceil(totalDocs / limit);
  const skip = (page - 1) * limit;
  const history = all.slice(skip, skip + limit);

  return ApiResponse.paginated(res, 'Reward wallet history retrieved', history, {
    page, limit, totalDocs, totalPages, skip,
  });
});

export const getPoolFundHistory = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user._id;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const skip = (page - 1) * limit;

  const [history, totalDocs, totalAgg, user, swpAgg] = await Promise.all([
    PoolReward.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    PoolReward.countDocuments({ userId }),
    PoolReward.aggregate([
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    User.findById(userId).select('swpBalance').lean(),
    SwpPurchase.aggregate([
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  return ApiResponse.paginated(res, 'Pool fund history retrieved', history, {
    page, limit, totalDocs, totalPages: Math.ceil(totalDocs / limit), skip,
    totalPoolFundEarned: Math.round((totalAgg[0]?.total ?? 0) * 100) / 100,
    totalSwpPurchased: swpAgg[0]?.total ?? 0,
    currentSwpBalance: user?.swpBalance ?? 0,
  } as any);
});
