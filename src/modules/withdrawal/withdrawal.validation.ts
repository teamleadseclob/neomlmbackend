import Joi from 'joi';
import { ethers } from 'ethers';
import { ValidationSchema } from '../../types';
import { TRANSACTION_STATUS } from './withdrawal.constants';
import env from '../../config/env';

const BEP20_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export const isValidBep20Address = (address: string): boolean => BEP20_ADDRESS_REGEX.test(address);

export const isContractAddress = async (address: string): Promise<boolean> => {
  const provider = new ethers.JsonRpcProvider(env.bsc.rpcUrl);
  const code = await provider.getCode(address);
  return code !== '0x';
};

export const history: ValidationSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid(...Object.values(TRANSACTION_STATUS)).optional(),
  }),
};

export const withdraw: ValidationSchema = {
  body: Joi.object({
    walletAddress: Joi.string()
      .required()
      .trim()
      .pattern(BEP20_ADDRESS_REGEX)
      .messages({
        'string.pattern.base': 'Invalid BEP20 wallet address',
        'any.required': 'Wallet address is required',
      }),
    amount: Joi.number()
      .positive()
      .required()
      .messages({
        'number.positive': 'Amount must be greater than 0',
        'any.required': 'Amount is required',
      }),
  }),
};

export const approveWithdrawal: ValidationSchema = {
  params: Joi.object({
    id: Joi.string().required().messages({ 'any.required': 'Transaction ID is required' }),
  }),
};

export const rejectWithdrawal: ValidationSchema = {
  params: Joi.object({
    id: Joi.string().required().messages({ 'any.required': 'Transaction ID is required' }),
  }),
  body: Joi.object({
    reason: Joi.string().required().trim().min(3).max(500).messages({
      'any.required': 'Rejection reason is required',
      'string.min': 'Reason must be at least 3 characters',
    }),
  }),
};

export const retryWithdrawal: ValidationSchema = {
  params: Joi.object({
    id: Joi.string().required().messages({ 'any.required': 'Transaction ID is required' }),
  }),
};

export const refundWithdrawal: ValidationSchema = {
  params: Joi.object({
    id: Joi.string().required().messages({ 'any.required': 'Transaction ID is required' }),
  }),
};

export const adminListWithdrawals: ValidationSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid(...Object.values(TRANSACTION_STATUS)).optional(),
    userId: Joi.string().optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
  }),
};
