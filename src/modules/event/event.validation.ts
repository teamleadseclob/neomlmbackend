import Joi from 'joi';
import { ValidationSchema } from '../../types';

export const updateEvent: ValidationSchema = {
  params: Joi.object({
    id: Joi.string()
      .pattern(/^[a-fA-F0-9]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid event ID format',
        'any.required': 'Event ID is required',
      }),
  }),
  body: Joi.object({
    title: Joi.string().trim().max(200).optional(),
    description: Joi.string().trim().max(2000).optional(),
    expiryDays: Joi.number().integer().min(1).max(365).optional(),
  }).min(1).messages({
    'object.min': 'At least one field must be provided',
  }),
};

export const eventIdParam: ValidationSchema = {
  params: Joi.object({
    id: Joi.string()
      .pattern(/^[a-fA-F0-9]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid event ID format',
        'any.required': 'Event ID is required',
      }),
  }),
};
