import Joi from 'joi';
import { ValidationSchema } from '../../types';

export const updateProfile: ValidationSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(100).optional().messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 100 characters',
    }),
  }),
};

export const getUserById: ValidationSchema = {
  params: Joi.object({
    userId: Joi.string().trim().required().messages({
      'any.required': 'User ID is required',
    }),
  }),
};

export const incomeChart: ValidationSchema = {
  query: Joi.object({
    month: Joi.number().integer().min(1).max(12).default(new Date().getMonth() + 1),
    year: Joi.number().integer().min(2020).max(2100).default(new Date().getFullYear()),
  }),
};

export const getUsers: ValidationSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),
};

export const sendReferral: ValidationSchema = {
  body: Joi.object({
    email: Joi.string().email().trim().lowercase().required().messages({
      'string.email': 'Please provide a valid email',
      'any.required': 'Email is required',
    }),
  }),
};
