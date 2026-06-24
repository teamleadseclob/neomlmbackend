import mongoose, { Schema, Model, Document, Types } from 'mongoose';

export interface IEarningProgress extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  totalInvested: number;
  roiCap: number;
  mlrCap: number;
  roiEarned: number;
  mlrEarned: number;
  mlrOverflowToRoi: number; // MLR overflow that contributes to ROI progress after MLR hits 2x
  isRoiCapReached: boolean;
  isMlrCapReached: boolean;
  isAllStopped: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const earningProgressSchema = new Schema<IEarningProgress>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    totalInvested: { type: Number, default: 0 },
    roiCap: { type: Number, default: 0 },
    mlrCap: { type: Number, default: 0 },
    roiEarned: { type: Number, default: 0 },
    mlrEarned: { type: Number, default: 0 },
    mlrOverflowToRoi: { type: Number, default: 0 },
    isRoiCapReached: { type: Boolean, default: false },
    isMlrCapReached: { type: Boolean, default: false },
    isAllStopped: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const CAP_MULTIPLIER = 2;

/**
 * Get or create earning progress for a user.
 */
export const getEarningProgress = async (userId: Types.ObjectId): Promise<IEarningProgress> => {
  let progress = await EarningProgress.findOne({ userId });
  if (!progress) {
    const User = mongoose.model('User');
    const user = await User.findById(userId).select('totalInvested').lean();
    const totalInvested = (user as any)?.totalInvested ?? 0;
    progress = await EarningProgress.create({
      userId,
      totalInvested,
      roiCap: totalInvested * CAP_MULTIPLIER,
      mlrCap: totalInvested * CAP_MULTIPLIER,
    });
  }
  return progress;
};

/**
 * Recalculate caps when user's investment changes.
 */
export const recalculateCaps = async (userId: Types.ObjectId, newTotalInvested: number): Promise<void> => {
  const roiCap = newTotalInvested * CAP_MULTIPLIER;
  const mlrCap = newTotalInvested * CAP_MULTIPLIER;

  await EarningProgress.findOneAndUpdate(
    { userId },
    {
      totalInvested: newTotalInvested,
      roiCap,
      mlrCap,
      isRoiCapReached: false,
      isMlrCapReached: false,
      isAllStopped: false,
    },
    { upsert: true },
  );
};

/**
 * Credit ROI earning and return actual amount credited (after cap).
 * Returns 0 if ROI cap already reached.
 */
export const creditRoiProgress = async (userId: Types.ObjectId, amount: number): Promise<{ credited: number; capped: boolean }> => {
  const progress = await getEarningProgress(userId);

  if (progress.isAllStopped) return { credited: 0, capped: true };

  // ROI progress = roiEarned + mlrOverflowToRoi
  const roiProgress = progress.roiEarned + progress.mlrOverflowToRoi;
  const roiRemaining = progress.roiCap - roiProgress;

  if (roiRemaining <= 0) {
    await EarningProgress.findByIdAndUpdate(progress._id, { isRoiCapReached: true });
    return { credited: 0, capped: true };
  }

  let credited = Math.round(amount * 100) / 100;
  let capped = false;

  if (credited > roiRemaining) {
    credited = Math.round(roiRemaining * 100) / 100;
    capped = true;
  }

  const newRoiEarned = progress.roiEarned + credited;
  const newRoiProgress = newRoiEarned + progress.mlrOverflowToRoi;
  const isRoiCapReached = newRoiProgress >= progress.roiCap;

  // If ROI cap reached and MLR cap also reached → all stopped
  const isAllStopped = isRoiCapReached && progress.isMlrCapReached;

  await EarningProgress.findByIdAndUpdate(progress._id, {
    roiEarned: newRoiEarned,
    isRoiCapReached,
    isAllStopped,
  });

  return { credited, capped };
};

/**
 * Credit MLR earning and return actual amount credited (after cap).
 * If MLR cap already reached, overflow goes to ROI progress.
 */
export const creditMlrProgress = async (userId: Types.ObjectId, amount: number): Promise<{ credited: number; capped: boolean }> => {
  const progress = await getEarningProgress(userId);

  if (progress.isAllStopped) return { credited: 0, capped: true };

  // Check if ROI progress is full (meaning everything should stop)
  const roiProgress = progress.roiEarned + progress.mlrOverflowToRoi;
  if (roiProgress >= progress.roiCap && progress.isMlrCapReached) {
    await EarningProgress.findByIdAndUpdate(progress._id, { isAllStopped: true });
    return { credited: 0, capped: true };
  }

  let credited = Math.round(amount * 100) / 100;
  let capped = false;

  if (!progress.isMlrCapReached) {
    // MLR hasn't hit its own 2x yet — credit normally to MLR
    const mlrRemaining = progress.mlrCap - progress.mlrEarned;

    if (mlrRemaining <= 0) {
      // Just hit the cap — mark it and overflow this amount
      await EarningProgress.findByIdAndUpdate(progress._id, { isMlrCapReached: true });
      // Now overflow to ROI
      return creditMlrOverflow(progress, credited);
    }

    if (credited > mlrRemaining) {
      // Partially fits in MLR, rest overflows to ROI
      const mlrPortion = Math.round(mlrRemaining * 100) / 100;
      const overflowPortion = Math.round((credited - mlrRemaining) * 100) / 100;

      const newMlrEarned = progress.mlrEarned + mlrPortion;

      await EarningProgress.findByIdAndUpdate(progress._id, {
        mlrEarned: newMlrEarned,
        isMlrCapReached: true,
      });

      // Overflow the rest to ROI progress
      if (overflowPortion > 0) {
        const overflowResult = await creditMlrOverflowAmount(progress._id, progress.roiEarned, progress.mlrOverflowToRoi + overflowPortion, progress.roiCap, progress.isMlrCapReached);
        if (overflowResult.roiCapReached) {
          credited = mlrPortion + (overflowPortion - overflowResult.excess);
          capped = true;
        }
      }

      return { credited, capped };
    }

    // Fully fits in MLR
    const newMlrEarned = progress.mlrEarned + credited;
    const isMlrCapReached = newMlrEarned >= progress.mlrCap;

    await EarningProgress.findByIdAndUpdate(progress._id, {
      mlrEarned: newMlrEarned,
      isMlrCapReached,
    });

    return { credited, capped: false };
  } else {
    // MLR cap already reached — all MLR earnings overflow to ROI progress
    return creditMlrOverflow(progress, credited);
  }
};

async function creditMlrOverflow(progress: IEarningProgress, amount: number): Promise<{ credited: number; capped: boolean }> {
  const roiProgress = progress.roiEarned + progress.mlrOverflowToRoi;
  const roiRemaining = progress.roiCap - roiProgress;

  if (roiRemaining <= 0) {
    await EarningProgress.findByIdAndUpdate(progress._id, { isRoiCapReached: true, isAllStopped: true });
    return { credited: 0, capped: true };
  }

  let credited = Math.round(amount * 100) / 100;
  let capped = false;

  if (credited > roiRemaining) {
    credited = Math.round(roiRemaining * 100) / 100;
    capped = true;
  }

  const newOverflow = progress.mlrOverflowToRoi + credited;
  const newRoiProgress = progress.roiEarned + newOverflow;
  const isRoiCapReached = newRoiProgress >= progress.roiCap;
  const isAllStopped = isRoiCapReached;

  await EarningProgress.findByIdAndUpdate(progress._id, {
    mlrOverflowToRoi: newOverflow,
    isRoiCapReached,
    isAllStopped,
  });

  return { credited, capped };
}

async function creditMlrOverflowAmount(
  progressId: Types.ObjectId,
  roiEarned: number,
  newOverflow: number,
  roiCap: number,
  _isMlrCapReached: boolean,
): Promise<{ roiCapReached: boolean; excess: number }> {
  const newRoiProgress = roiEarned + newOverflow;
  let excess = 0;
  let finalOverflow = newOverflow;

  if (newRoiProgress > roiCap) {
    excess = Math.round((newRoiProgress - roiCap) * 100) / 100;
    finalOverflow = Math.round((newOverflow - excess) * 100) / 100;
  }

  const isRoiCapReached = (roiEarned + finalOverflow) >= roiCap;

  await EarningProgress.findByIdAndUpdate(progressId, {
    mlrOverflowToRoi: finalOverflow,
    isRoiCapReached,
    isAllStopped: isRoiCapReached,
  });

  return { roiCapReached: isRoiCapReached, excess };
}

const EarningProgress: Model<IEarningProgress> = mongoose.model<IEarningProgress>('EarningProgress', earningProgressSchema);

export default EarningProgress;
