import Joi from 'joi';
import { ValidationSchema } from '../../types';
import { EVENT_TYPES } from '../../models/Event';

export const createEvent: ValidationSchema = {
  body: Joi.object({
    title: Joi.string().trim().max(200).required().messages({
      'any.required': 'Title is required',
    }),
    description: Joi.string().trim().max(2000).required().messages({
      'any.required': 'Description is required',
    }),
    type: Joi.string().valid(...EVENT_TYPES).required().messages({
      'any.only': `Type must be one of: ${EVENT_TYPES.join(', ')}`,
      'any.required': 'Event type is required',
    }),
    mediaUrl: Joi.string().uri().trim().required().messages({
      'string.uri': 'Please provide a valid URL',
      'any.required': 'Media URL is required',
    }),
    expiryDays: Joi.number().integer().min(1).max(365).required().messages({
      'any.required': 'Expiry days is required',
    }),
  }),
};

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
    mediaUrl: Joi.string().uri().trim().optional(),
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
