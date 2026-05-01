import Joi from 'joi';
import { ValidationSchema } from '../../types';

export const setMnemonic: ValidationSchema = {
  body: Joi.object({
    mnemonic: Joi.string()
      .required()
      .trim()
      .custom((value, helpers) => {
        const words = value.split(/\s+/);
        if (words.length !== 12 && words.length !== 24) {
          return helpers.error('any.invalid');
        }
        return value;
      })
      .messages({
        'any.required': 'Mnemonic is required',
        'any.invalid': 'Mnemonic must be 12 or 24 words',
      }),
  }),
};
