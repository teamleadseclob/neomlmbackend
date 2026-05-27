import Joi from 'joi';
import { ValidationSchema } from '../../types';

export const expressInterest: ValidationSchema = {
  body: Joi.object({
    marketTitle: Joi.string().trim().max(200).required()
      .messages({ 'any.required': 'Market title is required' }),
  }),
};

export const adminList: ValidationSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    marketTitle: Joi.string().trim().optional(),
  }),
};
