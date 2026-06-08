import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IPoolConfig extends Document {
  percentage: number;
  createdAt: Date;
  updatedAt: Date;
}

const poolConfigSchema = new Schema<IPoolConfig>(
  {
    percentage: {
      type: Number,
      required: true,
      min: [0.01, 'Percentage must be at least 0.01'],
      max: [100, 'Percentage cannot exceed 100'],
    },
  },
  { timestamps: true },
);

export const DEFAULT_POOL_PERCENTAGE = 3;

export const getPoolConfig = async (): Promise<IPoolConfig> => {
  let config = await PoolConfig.findOne();
  if (!config) config = await PoolConfig.create({ percentage: DEFAULT_POOL_PERCENTAGE });
  return config;
};

const PoolConfig: Model<IPoolConfig> = mongoose.model<IPoolConfig>('PoolConfig', poolConfigSchema);

export default PoolConfig;
