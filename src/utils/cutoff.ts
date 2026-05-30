import { Types } from 'mongoose';
import User from '../models/User';

export const CUTOFF_PERCENTAGE = 5; // 5%
const ADMIN_ROLE = 'admin';

interface CutoffResult {
  grossAmount: number;
  cutoffAmount: number;
  netAmount: number;
}

/**
 * Calculate cutoff amounts from a gross earning.
 */
export const calculateCutoff = (grossAmount: number): CutoffResult => {
  const cutoffAmount = Math.round((grossAmount * CUTOFF_PERCENTAGE / 100) * 100) / 100;
  const netAmount = Math.round((grossAmount - cutoffAmount) * 100) / 100;
  return { grossAmount, cutoffAmount, netAmount };
};

/**
 * Credit earnings to a user with cutoff applied.
 * - User gets net amount in wallet
 * - Admin gets cutoff amount in wallet
 * - Tracks gross, cutoff, and net on user
 */
export const creditWithCutoff = async (
  userId: Types.ObjectId,
  grossAmount: number,
  additionalInc: Record<string, number> = {},
): Promise<CutoffResult> => {
  const { cutoffAmount, netAmount } = calculateCutoff(grossAmount);

  // Credit user (net amount)
  await User.findByIdAndUpdate(userId, {
    $inc: {
      walletBalance: netAmount,
      totalEarnings: netAmount,
      totalGrossEarnings: grossAmount,
      totalCutoffDeducted: cutoffAmount,
      ...additionalInc,
    },
  });

  // Credit admin (cutoff amount)
  if (cutoffAmount > 0) {
    await User.findOneAndUpdate(
      { role: ADMIN_ROLE },
      { $inc: { walletBalance: cutoffAmount } },
    );
  }

  return { grossAmount, cutoffAmount, netAmount };
};

/**
 * Credit earnings to a user WITHOUT cutoff (for ROI).
 * Full amount goes to user.
 */
export const creditWithoutCutoff = async (
  userId: Types.ObjectId,
  amount: number,
  additionalInc: Record<string, number> = {},
): Promise<void> => {
  await User.findByIdAndUpdate(userId, {
    $inc: {
      walletBalance: amount,
      totalEarnings: amount,
      totalGrossEarnings: amount,
      ...additionalInc,
    },
  });
};
