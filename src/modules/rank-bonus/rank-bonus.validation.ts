import Joi from 'joi';

export const updateAmountConfigSchema = {
  body: Joi.object({
    amount: Joi.number().positive().required(),
  }),
};

export const updateConfigSchema = {
  body: Joi.object({
    rankOrder: Joi.number().integer().valid(4, 5).required(),
    percentage: Joi.number().min(0).max(100).required(),
  }),
};

export const historyQuerySchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
  }),
};
