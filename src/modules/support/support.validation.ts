import Joi from 'joi';
import { ValidationSchema } from '../../types';
import { TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES } from '../../models/SupportTicket';

export const createTicket: ValidationSchema = {
  body: Joi.object({
    category: Joi.string()
      .valid(...TICKET_CATEGORIES)
      .required()
      .messages({
        'any.only': `Category must be one of: ${TICKET_CATEGORIES.join(', ')}`,
        'any.required': 'Category is required',
      }),
    fields: Joi.array()
      .items(
        Joi.object({
          label: Joi.string().trim().max(100).required(),
          value: Joi.string().trim().max(500).required(),
        }),
      )
      .max(10)
      .default([])
      .messages({
        'array.max': 'Maximum 10 fields allowed',
      }),
    priority: Joi.string()
      .valid(...TICKET_PRIORITIES)
      .required()
      .messages({
        'any.only': 'Priority must be low or high',
        'any.required': 'Priority is required',
      }),
    subject: Joi.string().trim().max(200).required().messages({
      'string.max': 'Subject cannot exceed 200 characters',
      'any.required': 'Subject is required',
    }),
    message: Joi.string().trim().max(5000).required().messages({
      'string.max': 'Message cannot exceed 5000 characters',
      'any.required': 'Message is required',
    }),
  }),
};

export const ticketIdParam: ValidationSchema = {
  params: Joi.object({
    ticketId: Joi.string().trim().required().messages({
      'any.required': 'Ticket ID is required',
    }),
  }),
};

export const getUserTickets: ValidationSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
    status: Joi.string()
      .valid(...TICKET_STATUSES)
      .optional(),
  }),
};

export const getAdminTickets: ValidationSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
    status: Joi.string()
      .valid(...TICKET_STATUSES)
      .optional(),
    priority: Joi.string()
      .valid(...TICKET_PRIORITIES)
      .optional(),
    category: Joi.string()
      .valid(...TICKET_CATEGORIES)
      .optional(),
    search: Joi.string().trim().max(100).optional(),
  }),
};

export const updateTicketStatus: ValidationSchema = {
  params: Joi.object({
    ticketId: Joi.string().trim().required().messages({
      'any.required': 'Ticket ID is required',
    }),
  }),
  body: Joi.object({
    status: Joi.string()
      .valid('in_progress', 'resolved', 'closed')
      .required()
      .messages({
        'any.only': 'Status must be in_progress, resolved, or closed',
        'any.required': 'Status is required',
      }),
    adminReply: Joi.string().trim().max(5000).optional().allow(null, ''),
  }),
};
