import Joi from 'joi';
import { ValidationSchema } from '../../types';

export const expressInterest: ValidationSchema = {
  body: Joi.object({
    marketTitle: Joi.string().trim().max(200).required()
      .messages({ 'any.required': 'Market title is required' }),
  }),
};

export const acceptInterest: ValidationSchema = {
  params: Joi.object({
    id: Joi.string().pattern(/^[a-fA-F0-9]{24}$/).required()
      .messages({ 'string.pattern.base': 'Invalid ID format' }),
  }),
  body: Joi.object({
    url: Joi.string().uri().required()
      .messages({ 'string.uri': 'URL must be a valid URI', 'any.required': 'URL is required' }),
  }),
};

export const adminList: ValidationSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    marketTitle: Joi.string().trim().optional(),
    status: Joi.string().valid('pending', 'accepted').optional(),
  }),
};
