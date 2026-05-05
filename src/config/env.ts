import 'dotenv/config';

const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.DATABASE_URL || 'mongodb://localhost:27017/neo_mlm',
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '9000000', 100),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 100),
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromName: process.env.SMTP_FROM_NAME || 'NEO MLM',
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || '',
  },
  otp: {
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10),
    length: 6,
  },
  bsc: {
    rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed.binance.org/',
    usdtContract: process.env.BSC_USDT_CONTRACT || '0x55d398326f99059fF775485246999027B3197955',
  },
  isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  },
  isProduction(): boolean {
    return this.nodeEnv === 'production';
  },
  isTest(): boolean {
    return this.nodeEnv === 'test';
  },
};

export default env;
