import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';
import Commission from '../../models/Commission';
import MultiLevelReward from '../../models/MultiLevelReward';
import RankReward from '../../models/RankReward';
import RankBonusReward from '../../models/RankBonusReward';
import SpecialReward from '../../models/SpecialReward';
import { AuthRequest } from '../../types';

export const getRewardWallet = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user._id;

  const [referralAgg, layeredAgg, rankAgg, royaltyAgg, specialAgg] = await Promise.all([
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
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  const referralIncome = referralAgg[0]?.total ?? 0;
  const layeredRewards = typeof layeredAgg === 'number' ? layeredAgg : 0;
  const rankIncome = rankAgg[0]?.total ?? 0;
  const royaltyRewards = royaltyAgg[0]?.total ?? 0;
  const specialRewards = specialAgg[0]?.total ?? 0;

  const totalRewardWallet = referralIncome + layeredRewards + rankIncome + royaltyRewards + specialRewards;

  return ApiResponse.success(res, 'Reward wallet retrieved', {
    totalRewardWallet: Math.round(totalRewardWallet * 100) / 100,
    breakdown: {
      referralIncome: Math.round(referralIncome * 100) / 100,
      layeredRewards: Math.round(layeredRewards * 100) / 100,
      rankIncome: Math.round(rankIncome * 100) / 100,
      royaltyRewards: Math.round(royaltyRewards * 100) / 100,
      specialRewards: Math.round(specialRewards * 100) / 100,
    },
  });
});
