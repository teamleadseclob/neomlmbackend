import Joi from 'joi';
import { ValidationSchema } from '../../types';
import { MIN_INVESTMENT } from '../../models/SwpPurchase';

export const invest: ValidationSchema = {
  body: Joi.object({
    amount: Joi.number()
      .min(MIN_INVESTMENT)
      .required()
      .messages({
        'number.min': `Minimum investment is $${MIN_INVESTMENT}`,
        'any.required': 'Amount is required',
      })
  }),
};
 