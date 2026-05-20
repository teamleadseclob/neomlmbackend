import Joi from 'joi';
import { ValidationSchema } from '../../types';

export const toggleNotification: ValidationSchema = {
  params: Joi.object({
    id: Joi.string()
      .pattern(/^[a-fA-F0-9]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid notification ID format',
        'any.required': 'Notification ID is required',
      }),
  }),
  body: Joi.object({
    isEnabled: Joi.boolean().required().messages({
      'any.required': 'isEnabled is required',
    }),
  }),
};

export const notificationIdParam: ValidationSchema = {
  params: Joi.object({
    id: Joi.string()
      .pattern(/^[a-fA-F0-9]{24}$/)
      .required()
      .messages({
        'string.pattern.base': 'Invalid notification ID format',
        'any.required': 'Notification ID is required',
      }),
  }),
};
