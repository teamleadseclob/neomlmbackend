import { FilterQuery, SortOrder, Types } from 'mongoose';
import User from '../../models/User';
import { IUser } from '../../types';

interface FindAllOptions {
  skip: number;
  limit: number;
  sort?: Record<string, SortOrder>;
}

class UserRepository {
  async findById(id: Types.ObjectId, selectFields = ''): Promise<IUser | null> {
    return User.findById(id).select(selectFields);
  }

  async findByUserId(userId: string): Promise<IUser | null> {
    return User.findOne({ userId });
  }

  async findByIdAndUpdate(id: Types.ObjectId, updateData: Partial<IUser>): Promise<IUser | null> {
    return User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  }

  async findAll(filter: FilterQuery<IUser> = {}, { skip, limit, sort = { createdAt: -1 } }: FindAllOptions): Promise<IUser[]> {
    return User.find(filter).sort(sort).skip(skip).limit(limit);
  }

  async countDocuments(filter: FilterQuery<IUser> = {}): Promise<number> {
    return User.countDocuments(filter);
  }
}

export default new UserRepository();
