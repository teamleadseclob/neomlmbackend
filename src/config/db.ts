import mongoose from 'mongoose';
import logger from './logger';
import env from './env';
import { seedLevelCommissions } from '../models/LevelCommission';
import { seedRankConfigs } from '../models/RankConfig';
import { seedMultiLevelRewardConfigs } from '../models/MultiLevelRewardConfig';
import { seedRankBonusConfigs } from '../models/RankBonusConfig';

const connectDB = async (): Promise<typeof mongoose> => {
  try {
    const conn = await mongoose.connect(env.mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`MongoDB connected: ${conn.connection.host}`);

    await seedLevelCommissions();
    await seedRankConfigs();
    await seedMultiLevelRewardConfigs();
    await seedRankBonusConfigs();
    logger.info('Level commissions, rank configs, multi-level reward configs & rank bonus configs seeded (if empty)');

    return conn;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`MongoDB connection error: ${message}`);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('error', (err: Error) => {
  logger.error(`MongoDB error: ${err.message}`);
});

export default connectDB;
