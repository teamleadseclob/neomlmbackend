import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import ApiError from '../utils/ApiError';
import { ValidationSchema } from '../types';

const validate = (schema: ValidationSchema) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const schemaRecord = schema as Record<string, Joi.ObjectSchema | undefined>;
    const keys = ['body', 'query', 'params'] as const;
    const errors: string[] = [];

    for (const key of keys) {
      const joiSchema = schemaRecord[key];
      if (!joiSchema) continue;

      const { error, value } = joiSchema.validate((req as unknown as Record<string, unknown>)[key], {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        errors.push(...error.details.map((detail) => detail.message));
      } else {
        (req as unknown as Record<string, unknown>)[key] = value;
      }
    }

    if (errors.length > 0) {
      return next(ApiError.badRequest(errors.join('. ')));
    }

    next();
  };
};

export default validate;
