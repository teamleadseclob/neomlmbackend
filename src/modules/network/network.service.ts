import { Types } from 'mongoose';
import ApiError from '../../utils/ApiError';
import networkRepository from './network.repository';
import User from '../../models/User';
import Network from '../../models/Network';
import { TreeNode, UserNetworkStats, NetworkStats } from '../../types';

class NetworkService {
  async getDownline(userId: string): Promise<TreeNode | null> {
    const user = await User.findOne({ userId });
    if (!user) throw ApiError.notFound('User not found');
    return this.buildTree(user._id);
  }

  private async buildTree(userObjectId: Types.ObjectId, depth = 0, maxDepth = 10): Promise<TreeNode | null> {
    if (depth >= maxDepth) return null;

    const user = await User.findById(userObjectId).select('name email userId');
    if (!user) return null;

    const childNodes = await Network.find({ parentId: userObjectId });

    const children = await Promise.all(
      childNodes.map((node) => this.buildTree(node.userId, depth + 1, maxDepth)),
    );

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      userId: user.userId,
      level: depth,
      children: children.filter((c): c is TreeNode => c !== null),
    };
  }

  async getUserNetworkStats(userId: string): Promise<UserNetworkStats> {
    const user = await User.findOne({ userId });
    if (!user) throw ApiError.notFound('User not found');

    const [totalDownline, networkNode, directReferrals] = await Promise.all([
      this.countDownline(user._id),
      networkRepository.findByUserId(user._id),
      networkRepository.countDirectChildren(user._id),
    ]);

    return {
      userId: user.userId,
      name: user.name,
      level: networkNode?.level ?? 0,
      totalDownline,
      directReferrals,
    };
  }

  private async countDownline(userObjectId: Types.ObjectId): Promise<number> {
    const children = await Network.find({ parentId: userObjectId });
    if (children.length === 0) return 0;

    const counts = await Promise.all(children.map((child) => this.countDownline(child.userId)));
    return children.length + counts.reduce((sum, c) => sum + c, 0);
  }

  async getNetworkStats(): Promise<NetworkStats> {
    return networkRepository.getNetworkStats();
  }
}

export default new NetworkService();
