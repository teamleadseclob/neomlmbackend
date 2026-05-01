import Joi from 'joi';
import { ValidationSchema } from '../../types';
import { ALLOWED_SWP_AMOUNTS } from '../../models/SwpPurchase';

export const commissionHistory: ValidationSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

export const purchase: ValidationSchema = {
  body: Joi.object({
    amount: Joi.number()
      .valid(...ALLOWED_SWP_AMOUNTS)
      .required()
      .messages({
        'any.only': `Amount must be one of: $${ALLOWED_SWP_AMOUNTS.join(', $')}`,
        'any.required': 'Amount is required',
      }),
  }),
};
