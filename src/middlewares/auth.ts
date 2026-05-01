import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import ApiError from '../utils/ApiError';
import User from '../models/User';
import env from '../config/env';
import { AuthRequest } from '../types';

interface JwtPayload {
  id: string;
}

const auth = async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Access token is missing or invalid');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.jwt.secret) as JwtPayload;

    const user = await User.findById(decoded.id);
    if (!user) {
      throw ApiError.unauthorized('User belonging to this token no longer exists');
    }

    if (user.isBlocked) {
      throw ApiError.forbidden('Your account has been blocked. Contact admin.');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    if (error instanceof Error) {
      if (error.name === 'JsonWebTokenError') return next(ApiError.unauthorized('Invalid token'));
      if (error.name === 'TokenExpiredError') return next(ApiError.unauthorized('Token has expired'));
    }
    next(error);
  }
};

export default auth;
