import { Types } from 'mongoose';
import UserNotification, { NotificationType } from '../models/UserNotification';

export const notifyEarning = async (
  userId: Types.ObjectId,
  type: NotificationType,
  amount: number,
  detail?: string,
): Promise<void> => {
  const labels: Record<NotificationType, string> = {
    referral_income: 'Referral Income',
    layered_rewards: 'Layered Rewards',
    rank_income: 'Rank Income',
    royalty_rewards: 'Royalty Rewards',
    special_rewards: 'Special Rewards',
  };

  const label = labels[type];
  const message = detail
    ? `You earned $${amount} from ${label} (${detail})`
    : `You earned $${amount} from ${label}`;

  await UserNotification.create({ userId, type, message, amount });
};
