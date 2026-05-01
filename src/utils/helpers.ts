import crypto from 'crypto';
import { Pagination, PaginationQuery } from '../types';

export const generateUserId = (): string => {
  const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `NEO-${randomHex}`;
};

export const buildPagination = (query: PaginationQuery, totalDocs: number): Pagination => {
  const page = Math.max(parseInt(query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || '10', 10), 1), 100);
  const skip = (page - 1) * limit;
  const totalPages = Math.ceil(totalDocs / limit);

  return { page, limit, skip, totalPages, totalDocs };
};

export const pick = <T extends Record<string, unknown>>(obj: T, keys: string[]): Partial<T> => {
  return keys.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      (acc as Record<string, unknown>)[key] = obj[key];
    }
    return acc;
  }, {} as Partial<T>);
};


