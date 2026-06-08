import Joi from 'joi';
import { ValidationSchema } from '../../types';
import { ALLOWED_SWP_AMOUNTS } from '../../models/SwpPurchase';

export const adminGrantSwp: ValidationSchema = {
  params: Joi.object({
    id: Joi.string()
      .pattern(/^[a-fA-F0-9]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid user ID format',
        'any.required': 'User ID is required',
      }),
  }),
  body: Joi.object({
    amount: Joi.number()
      .valid(...ALLOWED_SWP_AMOUNTS)
      .required()
      .messages({
        'any.only': `Amount must be one of: ${ALLOWED_SWP_AMOUNTS.join(', ')}`,
        'any.required': 'Amount is required',
      }),
  }),
};

export const revenueChart: ValidationSchema = {
  query: Joi.object({
    year: Joi.number().integer().min(2020).max(2100).default(new Date().getFullYear()),
  }),
};

export const getUsers: ValidationSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    isBlocked: Joi.string().valid('true', 'false').optional(),
    search: Joi.string().trim().max(100).optional(),
  }),
};

export const userIdParam: ValidationSchema = {
  params: Joi.object({
    id: Joi.string()
      .pattern(/^[a-fA-F0-9]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid user ID format',
        'any.required': 'User ID is required',
      }),
  }),
};

export const updateRoiConfig: ValidationSchema = {
  body: Joi.object({
    dailyRoiPercentage: Joi.number().min(0).max(100).required().messages({
      'number.min': 'Daily ROI percentage cannot be negative',
      'number.max': 'Daily ROI percentage cannot exceed 100',
      'any.required': 'Daily ROI percentage is required',
    }),
  }),
};

export const updateMultiLevelRewardConfig: ValidationSchema = {
  params: Joi.object({
    level: Joi.number().integer().min(1).max(20).required().messages({
      'number.min': 'Level must be between 1 and 20',
      'number.max': 'Level must be between 1 and 20',
      'any.required': 'Level is required',
    }),
  }),
  body: Joi.object({
    percentage: Joi.number().min(0).max(100).optional().messages({
      'number.min': 'Percentage cannot be negative',
      'number.max': 'Percentage cannot exceed 100',
    }),
    requiredRankOrder: Joi.number().integer().min(0).max(5).optional().messages({
      'number.min': 'Rank order must be between 0 and 5',
      'number.max': 'Rank order must be between 0 and 5',
    }),
    isActive: Joi.boolean().optional(),
  }).min(1).messages({
    'object.min': 'At least one field must be provided',
  }),
};

export const updateLevelCommission: ValidationSchema = {
  params: Joi.object({
    level: Joi.number().integer().min(1).max(10).required().messages({
      'number.min': 'Level must be between 1 and 10',
      'number.max': 'Level must be between 1 and 10',
      'any.required': 'Level is required',
    }),
  }),
  body: Joi.object({
    percentage: Joi.number().min(0).max(100).optional().messages({
      'number.min': 'Percentage cannot be negative',
      'number.max': 'Percentage cannot exceed 100',
    }),
    isActive: Joi.boolean().optional(),
  }).min(1).messages({
    'object.min': 'At least one field must be provided',
  }),
};

export const changeUserPassword: ValidationSchema = {
  params: Joi.object({
    id: Joi.string()
      .pattern(/^[a-fA-F0-9]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid user ID format',
        'any.required': 'User ID is required',
      }),
  }),
  body: Joi.object({
    newPassword: Joi.string().min(6).max(128).required().messages({
      'string.min': 'Password must be at least 6 characters',
      'string.max': 'Password cannot exceed 128 characters',
      'any.required': 'New password is required',
    }),
  }),
};

export const changeUserEmail: ValidationSchema = {
  params: Joi.object({
    id: Joi.string()
      .pattern(/^[a-fA-F0-9]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid user ID format',
        'any.required': 'User ID is required',
      }),
  }),
  body: Joi.object({
    newEmail: Joi.string().email().required().messages({
      'string.email': 'Invalid email format',
      'any.required': 'New email is required',
    }),
  }),
};

export const updatePoolConfig: ValidationSchema = {
  body: Joi.object({
    percentage: Joi.number().min(0.01).max(100).required().messages({
      'number.min': 'Percentage must be at least 0.01',
      'number.max': 'Percentage cannot exceed 100',
      'any.required': 'Percentage is required',
    }),
  }),
};

export const addUsdtToWallet: ValidationSchema = {
  params: Joi.object({
    id: Joi.string()
      .pattern(/^[a-fA-F0-9]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid user ID format',
        'any.required': 'User ID is required',
      }),
  }),
  body: Joi.object({
    amount: Joi.number().positive().required().messages({
      'number.positive': 'Amount must be a positive number',
      'any.required': 'Amount is required',
    }),
  }),
};

export const getTransactions: ValidationSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    type: Joi.string().valid(
      'withdrawal', 'swp_purchase', 'investment', 'level_commission',
      'roi', 'multilevel_reward', 'rank_reward', 'rank_bonus',
    ).optional(),
    userId: Joi.string().trim().optional(),
    fromDate: Joi.date().iso().optional(),
    toDate: Joi.date().iso().optional(),
    search: Joi.string().trim().max(100).optional(),
  }),
};
