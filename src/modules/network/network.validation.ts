import Joi from 'joi';
import { ValidationSchema } from '../../types';

export const getDownline: ValidationSchema = {
  params: Joi.object({
    userId: Joi.string().trim().required().messages({
      'any.required': 'User ID is required',
    }),
  }),
};

export const getUserNetworkStats: ValidationSchema = {
  params: Joi.object({
    userId: Joi.string().trim().required().messages({
      'any.required': 'User ID is required',
    }),
  }),
};
