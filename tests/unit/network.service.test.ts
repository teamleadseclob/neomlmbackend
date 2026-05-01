import networkService from '../../src/modules/network/network.service';
import networkRepository from '../../src/modules/network/network.repository';
import User from '../../src/models/User';
import Network from '../../src/models/Network';
import { mockUser, mockNetworkNode, validObjectId } from '../fixtures/user.fixture';

jest.mock('../../src/modules/network/network.repository');
jest.mock('../../src/models/User');
jest.mock('../../src/models/Network');

const mockedNetworkRepo = networkRepository as jest.Mocked<typeof networkRepository>;
const mockedUser = User as jest.Mocked<typeof User>;
const mockedNetwork = Network as jest.Mocked<typeof Network>;

describe('NetworkService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('placeUser', () => {
    it('should place a user in the binary tree', async () => {
      const parentUser = { ...mockUser, userId: 'NEO-PARENT01' };
      const childUser = { ...mockUser, _id: validObjectId, userId: 'NEO-CHILD001' };

      (mockedUser.findOne as jest.Mock).mockResolvedValueOnce(childUser);
      (mockedUser.findOne as jest.Mock).mockResolvedValueOnce(parentUser);

      mockedNetworkRepo.findByUserId
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...mockNetworkNode, level: 0 } as any);

      mockedNetworkRepo.findByParentAndPosition.mockResolvedValue(null);

      mockedNetworkRepo.createNode.mockResolvedValue({
        userId: childUser._id,
        parentId: parentUser._id,
        position: 'left',
        level: 1,
      } as any);

      mockedNetworkRepo.updateUserChildren.mockResolvedValue(parentUser as any);

      const result = await networkService.placeUser({
        userId: 'NEO-CHILD001',
        parentUserId: 'NEO-PARENT01',
        position: 'left',
      });

      expect(result.position).toBe('left');
      expect(result.level).toBe(1);
      expect(mockedNetworkRepo.createNode).toHaveBeenCalledTimes(1);
      expect(mockedNetworkRepo.updateUserChildren).toHaveBeenCalledTimes(1);
    });

    it('should throw error if user not found', async () => {
      (mockedUser.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        networkService.placeUser({
          userId: 'INVALID',
          parentUserId: 'NEO-PARENT01',
          position: 'left',
        }),
      ).rejects.toThrow('User not found');
    });

    it('should throw error if parent not found', async () => {
      (mockedUser.findOne as jest.Mock).mockResolvedValueOnce(mockUser);
      (mockedUser.findOne as jest.Mock).mockResolvedValueOnce(null);

      await expect(
        networkService.placeUser({
          userId: 'NEO-CHILD001',
          parentUserId: 'INVALID',
          position: 'left',
        }),
      ).rejects.toThrow('Parent user not found');
    });

    it('should throw conflict if user already placed', async () => {
      (mockedUser.findOne as jest.Mock).mockResolvedValueOnce(mockUser);
      (mockedUser.findOne as jest.Mock).mockResolvedValueOnce({ ...mockUser, userId: 'NEO-PARENT01' });

      mockedNetworkRepo.findByUserId.mockResolvedValue({
        ...mockNetworkNode,
        position: 'left',
      } as any);

      await expect(
        networkService.placeUser({
          userId: mockUser.userId,
          parentUserId: 'NEO-PARENT01',
          position: 'left',
        }),
      ).rejects.toThrow('User is already placed in the network');
    });

    it('should throw conflict if position is already occupied', async () => {
      (mockedUser.findOne as jest.Mock).mockResolvedValueOnce(mockUser);
      (mockedUser.findOne as jest.Mock).mockResolvedValueOnce({ ...mockUser, userId: 'NEO-PARENT01' });

      mockedNetworkRepo.findByUserId.mockResolvedValue(null);
      mockedNetworkRepo.findByParentAndPosition.mockResolvedValue(mockNetworkNode as any);

      await expect(
        networkService.placeUser({
          userId: mockUser.userId,
          parentUserId: 'NEO-PARENT01',
          position: 'left',
        }),
      ).rejects.toThrow('left position is already occupied');
    });
  });

  describe('getDownline', () => {
    it('should throw not found if user does not exist', async () => {
      (mockedUser.findOne as jest.Mock).mockResolvedValue(null);

      await expect(networkService.getDownline('INVALID')).rejects.toThrow('User not found');
    });

    it('should return downline tree for valid user', async () => {
      (mockedUser.findOne as jest.Mock).mockResolvedValue(mockUser);
      (mockedUser.findById as jest.Mock).mockReturnValue({
        select: jest.fn().mockResolvedValue({
          ...mockUser,
          leftChild: null,
          rightChild: null,
        }),
      });

      const result = await networkService.getDownline(mockUser.userId);

      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('left');
      expect(result).toHaveProperty('right');
    });
  });

  describe('getUserNetworkStats', () => {
    it('should return network stats for a user', async () => {
      (mockedUser.findOne as jest.Mock).mockResolvedValue(mockUser);
      mockedNetworkRepo.findByUserId.mockResolvedValue(mockNetworkNode as any);
      (mockedNetwork.find as jest.Mock).mockResolvedValue([]);

      const result = await networkService.getUserNetworkStats(mockUser.userId);

      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('totalDownline');
      expect(result).toHaveProperty('directReferrals');
    });

    it('should throw not found if user does not exist', async () => {
      (mockedUser.findOne as jest.Mock).mockResolvedValue(null);

      await expect(networkService.getUserNetworkStats('INVALID')).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('getNetworkStats', () => {
    it('should return overall network statistics', async () => {
      const mockStats = {
        totalNodes: 10,
        totalUsers: 10,
        activeUsers: 8,
        blockedUsers: 2,
        levelStats: [
          { level: 0, count: 1 },
          { level: 1, count: 2 },
        ],
      };
      mockedNetworkRepo.getNetworkStats.mockResolvedValue(mockStats);

      const result = await networkService.getNetworkStats();

      expect(result).toEqual(mockStats);
    });
  });
});
