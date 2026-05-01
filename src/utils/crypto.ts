import crypto from 'crypto';
import logger from '../config/logger';

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

const getEncryptionKey = (): Buffer => {
  const envKey = process.env.MNEMONIC_ENCRYPTION_KEY;
  if (envKey) {
    const keyBuffer = Buffer.from(envKey, 'base64');
    if (keyBuffer.length >= KEY_LENGTH) return keyBuffer.subarray(0, KEY_LENGTH);
    return crypto.scryptSync(envKey, 'salt', KEY_LENGTH);
  }
  logger.warn('No MNEMONIC_ENCRYPTION_KEY found. Using generated key. Set environment variable for production!');
  return crypto.randomBytes(KEY_LENGTH);
};

const ENCRYPTION_KEY = getEncryptionKey();

export const encrypt = (text: string): string => {
  if (!text) throw new Error('Invalid input: text must be a non-empty string');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const result = iv.toString('base64') + ':' + encrypted;
  return Buffer.from(result).toString('base64');
};

export const decrypt = (encryptedData: string): string => {
  if (!encryptedData) throw new Error('Invalid input: encryptedData must be a non-empty string');
  const combined = Buffer.from(encryptedData, 'base64').toString();
  const [ivBase64, encryptedBase64] = combined.split(':');
  if (!ivBase64 || !encryptedBase64) throw new Error('Invalid encrypted data format');
  const iv = Buffer.from(ivBase64, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedBase64, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

export const generateKey = (): string => crypto.randomBytes(KEY_LENGTH).toString('base64');
