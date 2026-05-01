import { Types } from 'mongoose';
import Network from '../../models/Network';
import User from '../../models/User';
import { INetwork, NetworkStats } from '../../types';

class NetworkRepository {
  async findByUserId(userId: Types.ObjectId): Promise<INetwork | null> {
    return Network.findOne({ userId });
  }

  async findDirectChildren(parentId: Types.ObjectId): Promise<INetwork[]> {
    return Network.find({ parentId });
  }

  async countDirectChildren(parentId: Types.ObjectId): Promise<number> {
    return Network.countDocuments({ parentId });
  }

  async getNetworkStats(): Promise<NetworkStats> {
    const [totalNodes, levelStats, totalUsers, activeUsers, blockedUsers] = await Promise.all([
      Network.countDocuments(),
      Network.aggregate([
        { $group: { _id: '$level', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      User.countDocuments(),
      User.countDocuments({ isBlocked: false }),
      User.countDocuments({ isBlocked: true }),
    ]);

    return {
      totalNodes,
      totalUsers,
      activeUsers,
      blockedUsers,
      levelStats: levelStats.map((l: { _id: number; count: number }) => ({ level: l._id, count: l.count })),
    };
  }
}

export default new NetworkRepository();
