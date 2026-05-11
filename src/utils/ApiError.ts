import { StatusCodes } from 'http-status-codes';

class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  data: Record<string, unknown> | null;

  constructor(statusCode: number, message: string, isOperational = true, stack = '', data: Record<string, unknown> | null = null) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.data = data;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message: string, data?: Record<string, unknown>): ApiError {
    return new ApiError(StatusCodes.BAD_REQUEST, message, true, '', data || null);
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(StatusCodes.UNAUTHORIZED, message);
  }

  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(StatusCodes.FORBIDDEN, message);
  }

  static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(StatusCodes.NOT_FOUND, message);
  }

  static conflict(message: string): ApiError {
    return new ApiError(StatusCodes.CONFLICT, message);
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, message, false);
  }
}

export default ApiError;
