import { Types } from 'mongoose';
import mongoose from 'mongoose';
import { ethers } from 'ethers';
import ApiError from '../../utils/ApiError';
import User from '../../models/User';
import Transaction from '../../models/Transaction';
import Mnemonic from '../../models/Mnemonic';
import { TRANSACTION_TYPES, TRANSACTION_STATUS } from './withdrawal.constants';
import { isContractAddress } from './withdrawal.validation';
import env from '../../config/env';
import logger from '../../config/logger';

const ERC20_ABI = [
  { type: 'event', name: 'Approval', inputs: [{ indexed: true, name: 'owner', type: 'address' }, { indexed: true, name: 'spender', type: 'address' }, { indexed: false, name: 'value', type: 'uint256' }] },
  { type: 'event', name: 'Transfer', inputs: [{ indexed: true, name: 'from', type: 'address' }, { indexed: true, name: 'to', type: 'address' }, { indexed: false, name: 'value', type: 'uint256' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint8' }] },
  { type: 'function', name: 'name', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] },
  { type: 'function', name: 'totalSupply', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'uint256' }] },
  { type: 'function', name: 'transfer', stateMutability: 'nonpayable', inputs: [{ name: 'recipient', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { type: 'function', name: 'transferFrom', stateMutability: 'nonpayable', inputs: [{ name: 'sender', type: 'address' }, { name: 'recipient', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
];

function maskAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

async function getWalletAndContract() {
  const mnemonic = await Mnemonic.getDecrypted();
  if (!mnemonic) throw ApiError.internal('System wallet not configured');

  const provider = new ethers.JsonRpcProvider(env.bsc.rpcUrl);
  const wallet = ethers.Wallet.fromPhrase(mnemonic);
  const signer = new ethers.Wallet(wallet.privateKey, provider);
  const contract = new ethers.Contract(env.bsc.usdtContract, ERC20_ABI, signer);

  return { wallet, signer, contract };
}

async function sendUSDT(recipientAddress: string, amount: number) {
  const { wallet, contract } = await getWalletAndContract();
  const amountWei = ethers.parseUnits(amount.toString(), 18);

  const balance = await contract.balanceOf(wallet.address);
  if (balance < amountWei) {
    throw ApiError.internal('Insufficient USDT balance in system wallet');
  }

  const tx = await contract.transfer(recipientAddress, amountWei);
  const receipt = await tx.wait();
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}

class WithdrawalService {
  // ─── User: Request withdrawal (creates PENDING, locks balance) ───
  async requestWithdrawal(userId: Types.ObjectId, walletAddress: string, amount: number) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found');
    if (user.isBlocked) throw ApiError.forbidden('Account is blocked');
    if (user.kycStatus !== 'approved') {
      throw ApiError.forbidden('KYC must be approved before requesting withdrawal');
    }

    if (user.walletBalance < amount) {
      throw ApiError.badRequest(`Insufficient balance. Available: $${user.walletBalance}`);
    }

    // Reject contract addresses (skip if RPC unavailable)
    try {
      if (await isContractAddress(walletAddress)) {
        throw ApiError.badRequest('Contract addresses not allowed. Please use a personal wallet.');
      }
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      logger.warn({ error: err.message }, 'Address validation skipped - RPC unavailable');
    }

    // Lock balance atomically
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      const balanceBefore = user.walletBalance;
      const balanceAfter = balanceBefore - amount;

      await User.findByIdAndUpdate(
        userId,
        { $inc: { walletBalance: -amount } },
        { session },
      );

      const transaction = await Transaction.create(
        [
          {
            userId: user._id,
            type: TRANSACTION_TYPES.WITHDRAWAL,
            amount,
            walletAddress,
            status: TRANSACTION_STATUS.PENDING,
            description: 'Withdrawal request pending admin approval',
            calculationDetails: {
              requestedAmount: amount,
              fee: 0,
              netAmount: amount,
              balanceBefore,
              balanceAfter,
            },
          },
        ],
        { session },
      );

      await session.commitTransaction();

      logger.info(
        { userId: user.userId, amount, wallet: maskAddress(walletAddress) },
        'Withdrawal request created (pending)',
      );

      return {
        transaction: {
          _id: transaction[0]._id,
          amount,
          walletAddress: maskAddress(walletAddress),
          status: TRANSACTION_STATUS.PENDING,
        },
        balanceBefore,
        balanceAfter,
      };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  // ─── User: Get own withdrawal history ───
  async getHistory(userId: Types.ObjectId, query: { page?: number; limit?: number; status?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { userId, type: TRANSACTION_TYPES.WITHDRAWAL };
    if (query.status) filter.status = query.status;

    const [user, transactions, totalDocs] = await Promise.all([
      User.findById(userId).select('totalEarnings walletBalance withdrawnAmount'),
      Transaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-__v'),
      Transaction.countDocuments(filter),
    ]);

    return {
      totalEarnings: user?.totalEarnings ?? 0,
      walletBalance: user?.walletBalance ?? 0,
      totalWithdrawnAmount: user?.withdrawnAmount ?? 0,
      transactions,
      pagination: { page, limit, totalDocs, totalPages: Math.ceil(totalDocs / limit) },
    };
  }

  // ─── Admin: Approve single withdrawal ───
  async approveWithdrawal(transactionId: string, adminId: Types.ObjectId) {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) throw ApiError.notFound('Transaction not found');
    if (transaction.status !== TRANSACTION_STATUS.PENDING) {
      throw ApiError.badRequest(`Transaction is already ${transaction.status}`);
    }

    // Send USDT on-chain
    let blockchainResult: { txHash: string; blockNumber: number };
    try {
      blockchainResult = await sendUSDT(transaction.walletAddress, transaction.amount);
    } catch (err: any) {
      logger.error(
        { transactionId, error: err.message },
        'Blockchain transfer failed during approval',
      );
      transaction.status = TRANSACTION_STATUS.FAILED;
      transaction.failureReason = err.message;
      await transaction.save();
      throw ApiError.internal('Blockchain transfer failed. Transaction marked as failed.');
    }

    // Update transaction + user
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      await Transaction.findByIdAndUpdate(
        transactionId,
        {
          $set: {
            status: TRANSACTION_STATUS.COMPLETED,
            txHash: blockchainResult.txHash,
            blockNumber: blockchainResult.blockNumber,
            approvedBy: adminId,
            description: 'USDT withdrawal approved and sent',
          },
        },
        { session },
      );

      await User.findByIdAndUpdate(
        transaction.userId,
        {
          $inc: { withdrawnAmount: transaction.amount },
          $set: { lastWithdrawalDate: new Date() },
        },
        { session },
      );

      await session.commitTransaction();

      logger.info(
        { transactionId, txHash: blockchainResult.txHash, amount: transaction.amount },
        'Withdrawal approved and sent',
      );

      return {
        _id: transaction._id,
        amount: transaction.amount,
        status: TRANSACTION_STATUS.COMPLETED,
        txHash: blockchainResult.txHash,
        blockNumber: blockchainResult.blockNumber,
      };
    } catch (err) {
      await session.abortTransaction();
      throw ApiError.internal('Failed to record approval. Contact support.');
    } finally {
      session.endSession();
    }
  }

  // ─── Admin: Reject single withdrawal (refund balance) ───
  async rejectWithdrawal(transactionId: string, adminId: Types.ObjectId, reason: string) {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) throw ApiError.notFound('Transaction not found');
    if (transaction.status !== TRANSACTION_STATUS.PENDING) {
      throw ApiError.badRequest(`Transaction is already ${transaction.status}`);
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      await Transaction.findByIdAndUpdate(
        transactionId,
        {
          $set: {
            status: TRANSACTION_STATUS.REJECTED,
            rejectionReason: reason,
            rejectedBy: adminId,
            description: 'Withdrawal rejected by admin',
          },
        },
        { session },
      );

      // Refund locked balance
      await User.findByIdAndUpdate(
        transaction.userId,
        { $inc: { walletBalance: transaction.amount } },
        { session },
      );

      await session.commitTransaction();

      logger.info({ transactionId, reason }, 'Withdrawal rejected, balance refunded');

      return {
        _id: transaction._id,
        amount: transaction.amount,
        status: TRANSACTION_STATUS.REJECTED,
        rejectionReason: reason,
      };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  // ─── Admin: Bulk approve all pending withdrawals ───
  async bulkApprove(adminId: Types.ObjectId) {
    const pendingTxns = await Transaction.find({
      type: TRANSACTION_TYPES.WITHDRAWAL,
      status: TRANSACTION_STATUS.PENDING,
    });

    if (pendingTxns.length === 0) {
      throw ApiError.badRequest('No pending withdrawals to approve');
    }

    const results: { transactionId: string; status: string; txHash?: string; error?: string }[] = [];

    for (const txn of pendingTxns) {
      try {
        const result = await this.approveWithdrawal(txn._id.toString(), adminId);
        results.push({ transactionId: txn._id.toString(), status: 'completed', txHash: result.txHash });
      } catch (err: any) {
        results.push({ transactionId: txn._id.toString(), status: 'failed', error: err.message });
      }
    }

    const completed = results.filter((r) => r.status === 'completed').length;
    const failed = results.filter((r) => r.status === 'failed').length;

    logger.info({ total: pendingTxns.length, completed, failed }, 'Bulk approval completed');

    return { total: pendingTxns.length, completed, failed, results };
  }

  // ─── Admin: Retry failed withdrawal ───
  async retryWithdrawal(transactionId: string, adminId: Types.ObjectId) {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) throw ApiError.notFound('Transaction not found');
    if (transaction.status !== TRANSACTION_STATUS.FAILED) {
      throw ApiError.badRequest(`Only failed transactions can be retried. Current status: ${transaction.status}`);
    }

    // Send USDT on-chain
    let blockchainResult: { txHash: string; blockNumber: number };
    try {
      blockchainResult = await sendUSDT(transaction.walletAddress, transaction.amount);
    } catch (err: any) {
      logger.error(
        { transactionId, error: err.message },
        'Blockchain transfer failed during retry',
      );
      transaction.failureReason = err.message;
      await transaction.save();
      throw ApiError.internal('Retry failed. Blockchain transfer unsuccessful.');
    }

    // Update transaction + user
    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      await Transaction.findByIdAndUpdate(
        transactionId,
        {
          $set: {
            status: TRANSACTION_STATUS.COMPLETED,
            txHash: blockchainResult.txHash,
            blockNumber: blockchainResult.blockNumber,
            approvedBy: adminId,
            failureReason: null,
            description: 'USDT withdrawal approved and sent (retried)',
          },
        },
        { session },
      );

      await User.findByIdAndUpdate(
        transaction.userId,
        {
          $inc: { withdrawnAmount: transaction.amount },
          $set: { lastWithdrawalDate: new Date() },
        },
        { session },
      );

      await session.commitTransaction();

      logger.info(
        { transactionId, txHash: blockchainResult.txHash, amount: transaction.amount },
        'Withdrawal retry successful',
      );

      return {
        _id: transaction._id,
        amount: transaction.amount,
        status: TRANSACTION_STATUS.COMPLETED,
        txHash: blockchainResult.txHash,
        blockNumber: blockchainResult.blockNumber,
      };
    } catch (err) {
      await session.abortTransaction();
      throw ApiError.internal('Failed to record retry. Contact support.');
    } finally {
      session.endSession();
    }
  }

  // ─── Admin: Refund failed withdrawal (return balance to user) ───
  async refundWithdrawal(transactionId: string, adminId: Types.ObjectId) {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) throw ApiError.notFound('Transaction not found');
    if (transaction.status !== TRANSACTION_STATUS.FAILED) {
      throw ApiError.badRequest(`Only failed transactions can be refunded. Current status: ${transaction.status}`);
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();

      await Transaction.findByIdAndUpdate(
        transactionId,
        {
          $set: {
            status: TRANSACTION_STATUS.REJECTED,
            rejectedBy: adminId,
            rejectionReason: 'Refunded after blockchain failure',
            description: 'Withdrawal refunded by admin after failure',
          },
        },
        { session },
      );

      await User.findByIdAndUpdate(
        transaction.userId,
        { $inc: { walletBalance: transaction.amount } },
        { session },
      );

      await session.commitTransaction();

      logger.info({ transactionId, amount: transaction.amount }, 'Failed withdrawal refunded');

      return {
        _id: transaction._id,
        amount: transaction.amount,
        status: TRANSACTION_STATUS.REJECTED,
        rejectionReason: 'Refunded after blockchain failure',
      };
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  // ─── Admin: List withdrawals with pagination + filters ───
  async adminListWithdrawals(query: {
    page?: number;
    limit?: number;
    status?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { type: TRANSACTION_TYPES.WITHDRAWAL };

    if (query.status) filter.status = query.status;

    if (query.userId) {
      const user = await User.findOne({ userId: query.userId }).select('_id');
      if (!user) throw ApiError.notFound('User not found');
      filter.userId = user._id;
    }

    if (query.startDate || query.endDate) {
      filter.createdAt = {} as Record<string, Date>;
      if (query.startDate) (filter.createdAt as Record<string, Date>).$gte = new Date(query.startDate);
      if (query.endDate) (filter.createdAt as Record<string, Date>).$lte = new Date(query.endDate);
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const summaryFilter = { type: TRANSACTION_TYPES.WITHDRAWAL };

    const [transactions, totalDocs, summaryAgg, todayAgg] = await Promise.all([
      Transaction.find(filter)
        .populate('userId', 'name email userId')
        .populate('approvedBy', 'name userId')
        .populate('rejectedBy', 'name userId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Transaction.countDocuments(filter),
      Transaction.aggregate([
        { $match: summaryFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
          },
        },
      ]),
      Transaction.aggregate([
        { $match: { ...summaryFilter, createdAt: { $gte: todayStart } } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    const statusMap = (agg: { _id: string; count: number; totalAmount: number }[]) => {
      const map: Record<string, { count: number; totalAmount: number }> = {};
      for (const item of agg) map[item._id] = { count: item.count, totalAmount: item.totalAmount };
      return map;
    };

    const sm = statusMap(summaryAgg);
    const tm = statusMap(todayAgg);

    const summary = {
      totalRequests: Object.values(sm).reduce((s, v) => s + v.count, 0),
      totalApproved: sm[TRANSACTION_STATUS.COMPLETED]?.count ?? 0,
      totalPending: sm[TRANSACTION_STATUS.PENDING]?.count ?? 0,
      totalRejected: sm[TRANSACTION_STATUS.REJECTED]?.count ?? 0,
      totalAmountApproved: sm[TRANSACTION_STATUS.COMPLETED]?.totalAmount ?? 0,
      totalAmountPending: sm[TRANSACTION_STATUS.PENDING]?.totalAmount ?? 0,
      totalAmountRejected: sm[TRANSACTION_STATUS.REJECTED]?.totalAmount ?? 0,
      todayApproved: tm[TRANSACTION_STATUS.COMPLETED]?.count ?? 0,
      todayPending: tm[TRANSACTION_STATUS.PENDING]?.count ?? 0,
    };

    return {
      summary,
      transactions,
      pagination: {
        page,
        limit,
        totalDocs,
        totalPages: Math.ceil(totalDocs / limit),
      },
    };
  }
}

export default new WithdrawalService();
