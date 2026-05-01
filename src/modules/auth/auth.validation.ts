import Joi from 'joi';
import { ValidationSchema } from '../../types';

export const register: ValidationSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(100).required().messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required',
    }),
    email: Joi.string().email().trim().lowercase().required().messages({
      'string.email': 'Please provide a valid email',
      'any.required': 'Email is required',
    }),
    password: Joi.string().min(6).max(128).required().messages({
      'string.min': 'Password must be at least 6 characters',
      'any.required': 'Password is required',
    }),
    sponsorId: Joi.string().trim().allow(null, '').optional(),
  }),
};

export const verifyOtp: ValidationSchema = {
  body: Joi.object({
    email: Joi.string().email().trim().lowercase().required().messages({
      'string.email': 'Please provide a valid email',
      'any.required': 'Email is required',
    }),
    otp: Joi.string().length(6).pattern(/^\d+$/).required().messages({
      'string.length': 'OTP must be 6 digits',
      'string.pattern.base': 'OTP must contain only digits',
      'any.required': 'OTP is required',
    }),
  }),
};

export const resendOtp: ValidationSchema = {
  body: Joi.object({
    email: Joi.string().email().trim().lowercase().required().messages({
      'string.email': 'Please provide a valid email',
      'any.required': 'Email is required',
    }),
  }),
};

export const login: ValidationSchema = {
  body: Joi.object({
    userId: Joi.string().trim().required().messages({
      'any.required': 'Referral ID is required',
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required',
    }),
  }),
};
