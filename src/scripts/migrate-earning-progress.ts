import 'dotenv/config';
import mongoose from 'mongoose';
import env from '../config/env';
import User from '../models/User';
import EarningProgress from '../models/EarningProgress';
import logger from '../config/logger';

const CAP_MULTIPLIER = 2;

async function migrate() {
  await mongoose.connect(env.mongoUri);
  logger.info('Connected to MongoDB');

  const users = await User.find({ role: { $ne: 'admin' }, totalInvested: { $gt: 0 } })
    .select('_id totalInvested totalRoiEarned totalMultiLevelEarned')
    .lean();

  logger.info(`Found ${users.length} users with investments to migrate`);

  let created = 0;
  let skipped = 0;

  for (const user of users) {
    const exists = await EarningProgress.findOne({ userId: user._id });
    if (exists) {
      skipped++;
      continue;
    }

    const roiCap = user.totalInvested * CAP_MULTIPLIER;
    const mlrCap = user.totalInvested * CAP_MULTIPLIER;
    const roiEarned = user.totalRoiEarned ?? 0;
    const mlrEarned = user.totalMultiLevelEarned ?? 0;

    // Determine if MLR exceeded its 2x cap (overflow scenario)
    let mlrCapped = mlrEarned;
    let mlrOverflowToRoi = 0;

    if (mlrEarned > mlrCap) {
      mlrCapped = mlrCap;
      mlrOverflowToRoi = mlrEarned - mlrCap;
    }

    const roiProgress = roiEarned + mlrOverflowToRoi;
    const isRoiCapReached = roiProgress >= roiCap;
    const isMlrCapReached = mlrCapped >= mlrCap;
    const isAllStopped = isRoiCapReached && isMlrCapReached;

    await EarningProgress.create({
      userId: user._id,
      totalInvested: user.totalInvested,
      roiCap,
      mlrCap,
      roiEarned,
      mlrEarned: mlrCapped,
      mlrOverflowToRoi,
      isRoiCapReached,
      isMlrCapReached,
      isAllStopped,
    });

    created++;
  }

  logger.info(`Migration complete. Created: ${created}, Skipped (already exists): ${skipped}`);
  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  logger.error(err, 'Migration failed');
  process.exit(1);
});
