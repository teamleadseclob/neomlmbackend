import Joi from 'joi';
import { ValidationSchema } from '../../types';

export const invest: ValidationSchema = {
  body: Joi.object({
    amount: Joi.number()
      .required()
      .messages({
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
 