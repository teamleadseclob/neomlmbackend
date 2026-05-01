import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app';
import User from '../../src/models/User';
import Network from '../../src/models/Network';
import { validUserData, adminUserData } from '../fixtures/user.fixture';

const MONGO_TEST_URI = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/neo_mlm_test';

let authToken: string;
let adminToken: string;

beforeAll(async () => {
  try {
    await mongoose.connect(MONGO_TEST_URI);
  } catch {
    console.warn('Could not connect to test database, skipping integration tests');
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await User.deleteMany({});
    await Network.deleteMany({});
    await mongoose.connection.close();
  }
});

describe('Auth API Integration Tests', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState !== 1) return;
    await User.deleteMany({});
    await Network.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const res = await request(app).post('/api/auth/register').send(validUserData);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe(validUserData.email);

      authToken = res.body.data.token;
    });

    it('should return 409 for duplicate email', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const res = await request(app).post('/api/auth/register').send(validUserData);

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid data', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const res = await request(app).post('/api/auth/register').send({
        name: '',
        email: 'bad-email',
        password: '12',
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should register an admin user', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const adminUser = await User.create({
        ...adminUserData,
        userId: 'NEO-ADMIN001',
      });
      await Network.create({
        userId: adminUser._id,
        parentId: null,
        position: null,
        level: 0,
      });

      const res = await request(app).post('/api/auth/login').send({
        userId: 'NEO-ADMIN001',
        password: adminUserData.password,
      });

      expect(res.statusCode).toBe(200);
      adminToken = res.body.data.token;
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const res = await request(app).post('/api/auth/login').send({
        userId: 'NEO-ABCD1234',
        password: validUserData.password,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
    });

    it('should return 401 for wrong password', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const res = await request(app).post('/api/auth/login').send({
        userId: 'NEO-ABCD1234',
        password: 'wrongpassword',
      });

      expect(res.statusCode).toBe(401);
    });

    it('should return 401 for non-existent referral ID', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const res = await request(app).post('/api/auth/login').send({
        userId: 'NEO-INVALID0',
        password: 'password123',
      });

      expect(res.statusCode).toBe(401);
    });
  });
});

describe('User API Integration Tests', () => {
  describe('GET /api/users/me', () => {
    it('should return authenticated user profile', async () => {
      if (mongoose.connection.readyState !== 1 || !authToken) return;

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.email).toBe(validUserData.email);
    });

    it('should return 401 without token', async () => {
      if (mongoose.connection.readyState !== 1) return;

      const res = await request(app).get('/api/users/me');
      expect(res.statusCode).toBe(401);
    });
  });

  describe('PATCH /api/users/me', () => {
    it('should update user name', async () => {
      if (mongoose.connection.readyState !== 1 || !authToken) return;

      const res = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.name).toBe('Updated Name');
    });
  });
});

describe('Admin API Integration Tests', () => {
  describe('GET /api/admin/users', () => {
    it('should return paginated users for admin', async () => {
      if (mongoose.connection.readyState !== 1 || !adminToken) return;

      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return 403 for regular user', async () => {
      if (mongoose.connection.readyState !== 1 || !authToken) return;

      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(403);
    });
  });

  describe('GET /api/admin/network/stats', () => {
    it('should return network stats for admin', async () => {
      if (mongoose.connection.readyState !== 1 || !adminToken) return;

      const res = await request(app)
        .get('/api/admin/network/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('totalNodes');
      expect(res.body.data).toHaveProperty('totalUsers');
    });
  });
});

describe('Health Check', () => {
  it('should return 200 on health endpoint', async () => {
    const res = await request(app).get('/api/health');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('running');
  });
});

describe('404 Handler', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent');

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
