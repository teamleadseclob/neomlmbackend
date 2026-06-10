import { Types } from 'mongoose';
import ApiError from '../../utils/ApiError';
import networkRepository from './network.repository';
import User from '../../models/User';
import Network from '../../models/Network';
import RankReward from '../../models/RankReward';
import { TreeNode, UserNetworkStats, NetworkStats } from '../../types';

class NetworkService {
  async getDownline(userId: string): Promise<TreeNode | null> {
    const user = await User.findOne({ userId });
    if (!user) throw ApiError.notFound('User not found');
    return this.buildTree(user._id);
  }

  private async buildTree(userObjectId: Types.ObjectId): Promise<TreeNode | null> {
    const user = await User.findById(userObjectId).select('name email userId');
    if (!user) return null;

    const childNodes = await Network.find({ parentId: userObjectId });

    const children = await Promise.all(
      childNodes.map((node) => this.buildTree(node.userId)),
    );

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      userId: user.userId,
      level: 0,
      children: children.filter((c): c is TreeNode => c !== null),
    };
  }

  async getUserNetworkStats(userId: string): Promise<UserNetworkStats> {
    const user = await User.findOne({ userId });
    if (!user) throw ApiError.notFound('User not found');

    const downlineIds = await this.getAllDownlineIds(user._id);

    const [networkNode, directReferrals, teamInvestAgg] = await Promise.all([
      networkRepository.findByUserId(user._id),
      networkRepository.countDirectChildren(user._id),
      User.aggregate([
        { $match: { _id: { $in: downlineIds } } },
        { $group: { _id: null, totalInvested: { $sum: '$totalInvested' } } },
      ]),
    ]);

    return {
      userId: user.userId,
      name: user.name,
      level: networkNode?.level ?? 0,
      totalDownline: downlineIds.length,
      directReferrals,
      teamSwpVolume: user.totalSwpVolume,
      teamInvestmentVolume: teamInvestAgg[0]?.totalInvested ?? 0,
    };
  }

  private async getAllDownlineIds(userObjectId: Types.ObjectId): Promise<Types.ObjectId[]> {
    const ids: Types.ObjectId[] = [];
    const children = await Network.find({ parentId: userObjectId });
    for (const child of children) {
      ids.push(child.userId);
      const subIds = await this.getAllDownlineIds(child.userId);
      ids.push(...subIds);
    }
    return ids;
  }

  private async countDownline(userObjectId: Types.ObjectId): Promise<number> {
    const children = await Network.find({ parentId: userObjectId });
    if (children.length === 0) return 0;

    const counts = await Promise.all(children.map((child) => this.countDownline(child.userId)));
    return children.length + counts.reduce((sum, c) => sum + c, 0);
  }

  async getTeamMemberDetails(requesterId: Types.ObjectId, memberUserId: string) {
    const member = await User.findOne({ userId: memberUserId });
    if (!member) throw ApiError.notFound('Member not found');

    // Verify the member is in requester's downline
    const downlineIds = await this.getAllDownlineIds(requesterId);
    const isMember = downlineIds.some((id) => id.equals(member._id));
    if (!isMember) throw ApiError.forbidden('This user is not in your team');

    // Get highest rank achieved
    const highestRank = await RankReward.findOne({ userId: member._id })
      .sort({ createdAt: -1 })
      .select('rankName')
      .lean();

    // Get team totals
    const teamIds = await this.getAllDownlineIds(member._id);
    const teamAgg = await User.aggregate([
      { $match: { _id: { $in: teamIds } } },
      { $group: { _id: null, teamSwp: { $sum: '$swpBalance' }, teamTradingCapital: { $sum: '$totalInvested' } } },
    ]);

    return {
      userId: member.userId,
      name: member.name,
      rank: highestRank?.rankName ?? 'None',
      personalSwp: member.swpBalance,
      tradingCapital: member.totalInvested,
      teamSwpVolume: teamAgg[0]?.teamSwp ?? 0,
      teamTradingCapital: teamAgg[0]?.teamTradingCapital ?? 0,
    };
  }

  async getNetworkStats(): Promise<NetworkStats> {
    return networkRepository.getNetworkStats();
  }
}

export default new NetworkService();
