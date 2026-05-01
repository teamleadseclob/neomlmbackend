import { Types } from 'mongoose';
import ApiError from '../../utils/ApiError';
import User from '../../models/User';
import MultiLevelReward from '../../models/MultiLevelReward';

class MultiLevelRewardService {
  async getHistory(userId: Types.ObjectId, query: { page?: number; limit?: number }) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found');

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const filter = { earnerId: userId };

    const [rewards, totalDocs, totalsAgg] = await Promise.all([
      MultiLevelReward.find(filter)
        .populate('fromUserId', 'name userId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      MultiLevelReward.countDocuments(filter),
      MultiLevelReward.aggregate([
        { $match: { earnerId: userId } },
        {
          $group: {
            _id: null,
            totalGross: { $sum: { $ifNull: ['$grossAmount', '$rewardAmount'] } },
            totalCutoff: { $sum: { $ifNull: ['$cutoffAmount', 0] } },
            totalNet: { $sum: { $ifNull: ['$netAmount', '$rewardAmount'] } },
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
      history: rewards,
      pagination: { page, limit, totalDocs, totalPages: Math.ceil(totalDocs / limit) },
    };
  }
}

export default new MultiLevelRewardService();
