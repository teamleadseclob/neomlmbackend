import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../utils/ApiError';
import logger from '../config/logger';
import env from '../config/env';

interface MongoError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
  path?: string;
  value?: unknown;
  errors?: Record<string, { message: string }>;
}

const errorHandler = (err: MongoError, _req: Request, res: Response, _next: NextFunction): void => {
  let error: ApiError | MongoError = err;

  if (err.code === 11000 && err.keyValue) {
    const field = Object.keys(err.keyValue).join(', ');
    error = ApiError.conflict(`Duplicate value for: ${field}`);
  }

  if (err.name === 'ValidationError' && err.errors) {
    const messages = Object.values(err.errors).map((e) => e.message);
    error = ApiError.badRequest(messages.join('. '));
  }

  if (err.name === 'CastError') {
    error = ApiError.badRequest(`Invalid ${err.path}: ${err.value}`);
  }

  const statusCode = (error as ApiError).statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const message = error.message || 'Internal Server Error';

  if (statusCode >= 500) {
    logger.error({ err: error, stack: error.stack }, 'Server error');
  } else {
    logger.warn({ statusCode, message }, 'Client error');
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(env.isDevelopment() && { stack: error.stack }),
  });
};

export default errorHandler;
