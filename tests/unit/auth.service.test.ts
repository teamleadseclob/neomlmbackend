import authService from '../../src/modules/auth/auth.service';
import authRepository from '../../src/modules/auth/auth.repository';
import Network from '../../src/models/Network';
import { validUserData, validLoginData, mockUser } from '../fixtures/user.fixture';

jest.mock('../../src/modules/auth/auth.repository');
jest.mock('../../src/models/Network');
jest.mock('../../src/config/env', () => ({
  jwt: { secret: 'test-secret', expiresIn: '1d' },
}));

const mockedAuthRepo = authRepository as jest.Mocked<typeof authRepository>;
const mockedNetwork = Network as jest.Mocked<typeof Network>;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      mockedAuthRepo.emailExists.mockResolvedValue(false);
      mockedAuthRepo.findByUserId.mockResolvedValue(null);
      mockedAuthRepo.createUser.mockResolvedValue({
        _id: mockUser._id,
        name: validUserData.name,
        email: validUserData.email,
        userId: 'NEO-ABCD1234',
        role: 'user',
      } as any);
      (mockedNetwork.create as jest.Mock).mockResolvedValue({});

      const result = await authService.register(validUserData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe(validUserData.email);
      expect(mockedAuthRepo.createUser).toHaveBeenCalledTimes(1);
      expect(mockedNetwork.create).toHaveBeenCalledTimes(1);
    });

    it('should throw conflict error if email already exists', async () => {
      mockedAuthRepo.emailExists.mockResolvedValue(true);

      await expect(authService.register(validUserData)).rejects.toThrow(
        'Email is already registered',
      );
    });

    it('should throw error for invalid sponsor ID', async () => {
      mockedAuthRepo.emailExists.mockResolvedValue(false);
      mockedAuthRepo.findByUserId.mockResolvedValue(null);

      await expect(
        authService.register({ ...validUserData, sponsorId: 'INVALID-ID' }),
      ).rejects.toThrow('Invalid sponsor ID');
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const userWithCompare = {
        ...mockUser,
        comparePassword: jest.fn().mockResolvedValue(true),
      };
      mockedAuthRepo.findByUserIdWithPassword.mockResolvedValue(userWithCompare as any);

      const result = await authService.login(validLoginData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe(mockUser.email);
    });

    it('should throw unauthorized error for invalid referral ID', async () => {
      mockedAuthRepo.findByUserIdWithPassword.mockResolvedValue(null);

      await expect(authService.login(validLoginData)).rejects.toThrow(
        'Invalid referral ID or password',
      );
    });

    it('should throw unauthorized error for wrong password', async () => {
      const userWithCompare = {
        ...mockUser,
        comparePassword: jest.fn().mockResolvedValue(false),
      };
      mockedAuthRepo.findByUserIdWithPassword.mockResolvedValue(userWithCompare as any);

      await expect(authService.login(validLoginData)).rejects.toThrow(
        'Invalid referral ID or password',
      );
    });

    it('should throw forbidden error for blocked user', async () => {
      const blockedUser = { ...mockUser, isBlocked: true };
      mockedAuthRepo.findByUserIdWithPassword.mockResolvedValue(blockedUser as any);

      await expect(authService.login(validLoginData)).rejects.toThrow(
        'Your account has been blocked',
      );
    });
  });
});
