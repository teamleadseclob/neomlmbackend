import Joi from 'joi';
import { ValidationSchema } from '../../types';

export const submitKyc: ValidationSchema = {
  body: Joi.object({
    documentType: Joi.string()
      .valid('aadhaar', 'pan', 'passport', 'driving_license')
      .required()
      .messages({ 'any.required': 'Document type is required' }),
    documentNumber: Joi.string().trim().min(4).max(30).required()
      .messages({ 'any.required': 'Document number is required' }),
    documentImage: Joi.string().trim().required()
      .messages({ 'any.required': 'Document image URL is required' }),
  }),
};

export const reviewKyc: ValidationSchema = {
  params: Joi.object({
    id: Joi.string().required(),
  }),
  body: Joi.object({
    status: Joi.string().valid('approved', 'rejected').required(),
    rejectionReason: Joi.string().when('status', {
      is: 'rejected',
      then: Joi.string().required().messages({ 'any.required': 'Rejection reason is required' }),
      otherwise: Joi.string().optional().allow(null, ''),
    }),
  }),
};

export const kycIdParam: ValidationSchema = {
  params: Joi.object({
    id: Joi.string().required(),
  }),
};
