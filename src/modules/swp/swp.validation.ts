import Joi from 'joi';
import { ValidationSchema } from '../../types';

export const commissionHistory: ValidationSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

export const purchase: ValidationSchema = {
  body: Joi.object({
    amount: Joi.number()
      .positive()
      .required()
      .messages({
        'number.positive': 'Amount must be a positive number',
        'any.required': 'Amount is required',
      }),
    paymentMethod: Joi.string().valid('web3', 'wallet').default('web3'),
    walletAddress: Joi.string().when('paymentMethod', {
      is: 'web3',
      then: Joi.string().required(),
      otherwise: Joi.string().optional().allow(null, ''),
    }),
    transactionHash: Joi.string().when('paymentMethod', {
      is: 'web3',
      then: Joi.string().required(),
      otherwise: Joi.string().optional().allow(null, ''),
    }),
  }),
};
