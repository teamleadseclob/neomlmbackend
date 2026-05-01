import userService from '../../src/modules/user/user.service';
import userRepository from '../../src/modules/user/user.repository';
import { mockUser, validObjectId } from '../fixtures/user.fixture';

jest.mock('../../src/modules/user/user.repository');

const mockedUserRepo = userRepository as jest.Mocked<typeof userRepository>;

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      mockedUserRepo.findById.mockResolvedValue(mockUser as any);

      const result = await userService.getProfile(validObjectId);

      expect(result).toEqual(mockUser);
      expect(mockedUserRepo.findById).toHaveBeenCalledWith(validObjectId);
    });

    it('should throw not found error if user does not exist', async () => {
      mockedUserRepo.findById.mockResolvedValue(null);

      await expect(userService.getProfile(validObjectId)).rejects.toThrow('User not found');
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      mockedUserRepo.findByIdAndUpdate.mockResolvedValue(updatedUser as any);

      const result = await userService.updateProfile(validObjectId, { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
      expect(mockedUserRepo.findByIdAndUpdate).toHaveBeenCalledTimes(1);
    });

    it('should throw error if no valid fields provided', async () => {
      await expect(userService.updateProfile(validObjectId, {})).rejects.toThrow(
        'No valid fields to update',
      );
    });

    it('should throw not found if user does not exist', async () => {
      mockedUserRepo.findByIdAndUpdate.mockResolvedValue(null);

      await expect(userService.updateProfile(validObjectId, { name: 'Test' })).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('getUserByUserId', () => {
    it('should return public user profile by userId', async () => {
      mockedUserRepo.findByUserId.mockResolvedValue(mockUser as any);

      const result = await userService.getUserByUserId('NEO-ABCD1234');

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('userId');
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('walletBalance');
    });

    it('should throw not found if user does not exist', async () => {
      mockedUserRepo.findByUserId.mockResolvedValue(null);

      await expect(userService.getUserByUserId('INVALID')).rejects.toThrow('User not found');
    });
  });

  describe('getUsers', () => {
    it('should return paginated user list', async () => {
      mockedUserRepo.countDocuments.mockResolvedValue(25);
      mockedUserRepo.findAll.mockResolvedValue(Array(10).fill(mockUser) as any);

      const result = await userService.getUsers({ page: '1', limit: '10' });

      expect(result.users).toHaveLength(10);
      expect(result.pagination).toHaveProperty('totalDocs', 25);
      expect(result.pagination).toHaveProperty('totalPages', 3);
    });
  });
});
