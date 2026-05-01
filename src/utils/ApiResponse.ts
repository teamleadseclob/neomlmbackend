import { Response } from 'express';
import { Pagination } from '../types';

class ApiResponse {
  success: boolean;
  statusCode: number;
  message: string;
  data: unknown;

  constructor(statusCode: number, message: string, data: unknown = null) {
    this.success = statusCode >= 200 && statusCode < 300;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }

  static success(res: Response, message = 'Success', data: unknown = null, statusCode = 200): Response {
    return res.status(statusCode).json(new ApiResponse(statusCode, message, data));
  }

  static created(res: Response, message = 'Created successfully', data: unknown = null): Response {
    return res.status(201).json(new ApiResponse(201, message, data));
  }

  static paginated(res: Response, message = 'Success', data: unknown[] = [], pagination: Partial<Pagination> = {}): Response {
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message,
      data,
      pagination,
    });
  }
}

export default ApiResponse;
