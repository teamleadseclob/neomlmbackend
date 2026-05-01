import mongoose from 'mongoose';

export const validUserData = {
  name: 'John Doe',
  email: 'john@example.com',
  password: 'password123',
};

export const validUserData2 = {
  name: 'Jane Smith',
  email: 'jane@example.com',
  password: 'password456',
};

export const adminUserData = {
  name: 'Admin User',
  email: 'admin@example.com',
  password: 'admin123',
  role: 'admin' as const,
};

export const invalidUserData = {
  name: '',
  email: 'invalid-email',
  password: '123',
};

export const validLoginData = {
  userId: 'NEO-ABCD1234',
  password: 'password123',
};

export const validObjectId = new mongoose.Types.ObjectId();
export const validObjectId2 = new mongoose.Types.ObjectId();

export const mockUser = {
  _id: validObjectId,
  name: 'John Doe',
  email: 'john@example.com',
  password: '$2a$12$hashedpassword',
  userId: 'NEO-ABCD1234',
  role: 'user',
  walletBalance: 0,
  sponsorId: null,
  leftChild: null,
  rightChild: null,
  isBlocked: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  comparePassword: jest.fn(),
};

export const mockAdmin = {
  _id: validObjectId2,
  name: 'Admin User',
  email: 'admin@example.com',
  userId: 'NEO-ADMIN001',
  role: 'admin',
  isBlocked: false,
  comparePassword: jest.fn(),
};

export const mockNetworkNode = {
  _id: new mongoose.Types.ObjectId(),
  userId: validObjectId,
  parentId: null,
  position: null,
  level: 0,
};
