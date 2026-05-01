import User from '../../models/User';
import { IUser } from '../../types';

class AuthRepository {
  async createUser(userData: Partial<IUser>): Promise<IUser> {
    return User.create(userData);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email }).select('+password');
  }

  async findByUserId(userId: string): Promise<IUser | null> {
    return User.findOne({ userId });
  }

  async findByUserIdWithPassword(userId: string): Promise<IUser | null> {
    return User.findOne({ userId }).select('+password');
  }

  async emailExists(email: string): Promise<boolean> {
    const result = await User.exists({ email });
    return !!result;
  }

  /**
   * Create user with an already-hashed password.
   * Bypasses the pre-save hook by using direct insert.
   */
  async createUserWithHashedPassword(userData: {
    name: string;
    email: string;
    password: string;
    userId: string;
    sponsorId: string | null;
  }): Promise<IUser> {
    const user = new User(userData);
    (user as any).$skipPasswordHash = true;
    return user.save();
  }
}

export default new AuthRepository();
