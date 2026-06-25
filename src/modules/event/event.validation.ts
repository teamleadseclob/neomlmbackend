import Joi from 'joi';
import { ValidationSchema } from '../../types';
import { EVENT_TYPES, CATEGORIES, ACCESS_LEVELS, STATUS_OPTIONS } from '../../models/Event';

const commonFields = {
  imageUrls: Joi.array().items(Joi.string().uri().trim()).max(10).default([]),
  mediaUrl: Joi.string().uri().trim().optional(),
  pdfUrls: Joi.array().items(Joi.string().uri().trim()).max(10).default([]),
  googleMapsLink: Joi.string().uri().trim().optional().allow(null, ''),
};

const contestSchema = Joi.object({
  type: Joi.string().valid('contest').required(),
  title: Joi.string().trim().max(200).required(),
  subTitle: Joi.string().trim().max(300).optional(),
  description: Joi.string().trim().max(2000).optional(),
  ...commonFields,
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
});

const learningPackageSchema = Joi.object({
  type: Joi.string().valid('learning_package').required(),
  packageName: Joi.string().trim().max(200).required(),
  category: Joi.string().valid(...CATEGORIES).optional(),
  description: Joi.string().trim().max(2000).optional(),
  ...commonFields,
  price: Joi.number().min(0).optional(),
  duration: Joi.string().trim().optional(),
  accessLevel: Joi.string().valid(...ACCESS_LEVELS).optional(),
  status: Joi.string().valid(...STATUS_OPTIONS).default('active'),
});

const toolsSchema = Joi.object({
  type: Joi.string().valid('tools').required(),
  toolName: Joi.string().trim().max(200).required(),
  toolType: Joi.string().trim().max(100).optional(),
  description: Joi.string().trim().max(2000).optional(),
  ...commonFields,
  accessLevel: Joi.string().valid(...ACCESS_LEVELS).optional(),
  status: Joi.string().valid(...STATUS_OPTIONS).default('active'),
});

export const createEvent: ValidationSchema = {
  body: Joi.alternatives().conditional('.type', {
    switch: [
      { is: 'contest', then: contestSchema },
      { is: 'learning_package', then: learningPackageSchema },
      { is: 'tools', then: toolsSchema },
    ],
    otherwise: Joi.object({ type: Joi.string().valid(...EVENT_TYPES).required() }),
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
    subTitle: Joi.string().trim().max(300).optional(),
    description: Joi.string().trim().max(2000).optional(),
    imageUrls: Joi.array().items(Joi.string().uri().trim()).max(10).optional(),
    mediaUrl: Joi.string().uri().trim().allow(null, '').optional(),
    pdfUrls: Joi.array().items(Joi.string().uri().trim()).max(10).optional(),
    googleMapsLink: Joi.string().uri().trim().allow(null, '').optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    packageName: Joi.string().trim().max(200).optional(),
    category: Joi.string().valid(...CATEGORIES).optional(),
    price: Joi.number().min(0).optional(),
    duration: Joi.string().trim().optional(),
    accessLevel: Joi.string().valid(...ACCESS_LEVELS).optional(),
    status: Joi.string().valid(...STATUS_OPTIONS).optional(),
    toolName: Joi.string().trim().max(200).optional(),
    toolType: Joi.string().trim().max(100).optional(),
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
