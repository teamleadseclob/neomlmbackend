import { Types } from 'mongoose';
import ApiError from '../../utils/ApiError';
import User from '../../models/User';
import Investment from '../../models/Investment';
import Commission from '../../models/Commission';
import RoiHistory from '../../models/RoiHistory';
import MultiLevelReward from '../../models/MultiLevelReward';
import { MIN_INVESTMENT } from '../../models/SwpPurchase';

class InvestmentService {
  async invest(userId: Types.ObjectId, input: {
    amount: number;
    paymentMethod: 'web3' | 'wallet';
    walletAddress?: string;
    transactionHash?: string;
  }) {
    const { amount, paymentMethod, walletAddress, transactionHash } = input;

    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found');

    if (user.swpBalance === 0) {
      throw ApiError.badRequest('You must purchase an SWP package before investing');
    }

    const minAmount = paymentMethod === 'wallet' ? 10 : MIN_INVESTMENT;
    if (amount < minAmount) {
      throw ApiError.badRequest(`Minimum investment is $${minAmount} for ${paymentMethod} payment`);
    }

    const remaining = user.maxInvestmentLimit - user.totalInvested;
    if (remaining <= 0) {
      throw ApiError.badRequest('Investment limit reached. Purchase more SWP to continue investing.');
    }

    if (amount > remaining) {
      throw ApiError.badRequest(`Amount exceeds remaining limit. You can invest up to $${remaining}`);
    }

    // Deduct from wallet balance if paying via wallet
    if (paymentMethod === 'wallet') {
      if (user.walletBalance < amount) {
        throw ApiError.badRequest(`Insufficient wallet balance. Available: $${user.walletBalance}`);
      }
      user.walletBalance -= amount;
    }

    const investedBefore = user.totalInvested;
    const investedAfter = investedBefore + amount;

    user.totalInvested = investedAfter;
    await user.save();

    const investment = await Investment.create({
      userId: user._id,
      amount,
      investedBefore,
      investedAfter,
      paymentMethod,
      walletAddress: walletAddress || null,
      transactionHash: transactionHash || null,
    });

    return {
      investment: {
        _id: investment._id,
        amount,
        investedBefore,
        investedAfter,
      },
      swpBalance: user.swpBalance,
      maxInvestmentLimit: user.maxInvestmentLimit,
      totalInvested: investedAfter,
      remainingInvestment: user.maxInvestmentLimit - investedAfter,
    };
  }

  async getTradingCapitalStats(userId: Types.ObjectId) {
    const user = await User.findById(userId).select('walletBalance');
    if (!user) throw ApiError.notFound('User not found');

    const [roiAgg, mlrAgg, commissionAgg] = await Promise.all([
      RoiHistory.aggregate([
        { $match: { userId } },
        { $group: { _id: null, gross: { $sum: '$roiEarned' } } },
      ]),
      MultiLevelReward.aggregate([
        { $match: { earnerId: userId } },
        { $group: { _id: null, gross: { $sum: '$grossAmount' }, cutoff: { $sum: '$cutoffAmount' }, net: { $sum: '$netAmount' } } },
      ]),
      Commission.aggregate([
        { $match: { earnerId: userId } },
        { $group: { _id: null, gross: { $sum: '$grossAmount' }, cutoff: { $sum: '$cutoffAmount' }, net: { $sum: '$netAmount' } } },
      ]),
    ]);

    const roi = { gross: roiAgg[0]?.gross ?? 0, cutoff: 0, net: roiAgg[0]?.gross ?? 0 };
    const mlr = { gross: mlrAgg[0]?.gross ?? 0, cutoff: mlrAgg[0]?.cutoff ?? 0, net: mlrAgg[0]?.net ?? 0 };
    const referral = { gross: commissionAgg[0]?.gross ?? 0, cutoff: commissionAgg[0]?.cutoff ?? 0, net: commissionAgg[0]?.net ?? 0 };

    const roiMlrCombined = {
      gross: Math.round((roi.gross + mlr.gross) * 100) / 100,
      cutoff: Math.round((roi.cutoff + mlr.cutoff) * 100) / 100,
      net: Math.round((roi.net + mlr.net) * 100) / 100,
    };

    const totalEarnings = {
      gross: Math.round((roi.gross + mlr.gross + referral.gross) * 100) / 100,
      cutoff: Math.round((roi.cutoff + mlr.cutoff + referral.cutoff) * 100) / 100,
      net: Math.round((roi.net + mlr.net + referral.net) * 100) / 100,
    };

    return {
      walletBalance: user.walletBalance,
      totalEarnings,
      roiAndMlrCombined: roiMlrCombined,
      roi,
      mlr,
      referral,
    };
  }

  async getHistory(userId: Types.ObjectId) {
    return Investment.find({ userId }).sort({ createdAt: -1 });
  }
}

export default new InvestmentService();
