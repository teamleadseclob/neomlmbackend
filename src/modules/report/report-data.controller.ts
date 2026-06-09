import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import ApiResponse from '../../utils/ApiResponse';
import Transaction from '../../models/Transaction';
import SwpPurchase from '../../models/SwpPurchase';
import Investment from '../../models/Investment';
import Commission from '../../models/Commission';
import RankReward from '../../models/RankReward';
import RoiHistory from '../../models/RoiHistory';
import MultiLevelReward from '../../models/MultiLevelReward';
import RankBonusReward from '../../models/RankBonusReward';
import SpecialReward from '../../models/SpecialReward';
import PoolReward from '../../models/PoolReward';
import FundHistory from '../../models/FundHistory';
import User from '../../models/User';

function parsePagination(query: any) {
  const page = parseInt(query.page || '1', 10);
  const limit = parseInt(query.limit || '20', 10);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function addDateFilter(filter: Record<string, unknown>, query: any) {
  if (query.fromDate || query.toDate) {
    filter.createdAt = {} as Record<string, Date>;
    if (query.fromDate) (filter.createdAt as Record<string, Date>).$gte = new Date(query.fromDate);
    if (query.toDate) (filter.createdAt as Record<string, Date>).$lte = new Date(query.toDate);
  }
}

async function resolveUserId(userId: string) {
  const user = await User.findOne({ userId }).select('_id').lean();
  return user?._id ?? null;
}

export const getTransactions = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { type, userId, fromDate, toDate } = req.query as any;

  let userObjectId: any = null;
  if (userId) {
    userObjectId = await resolveUserId(userId);
    if (!userObjectId) return ApiResponse.paginated(res, 'Transactions retrieved', [], { page, limit, totalDocs: 0, totalPages: 0, skip });
  }

  const dateFilter: Record<string, unknown> = {};
  addDateFilter(dateFilter, { fromDate, toDate });

  const typesToFetch = type ? [type] : ['withdrawal', 'swp_purchase', 'investment'];
  const all: any[] = [];

  if (typesToFetch.includes('withdrawal')) {
    const f: Record<string, unknown> = { ...dateFilter };
    if (userObjectId) f.userId = userObjectId;
    const docs = await Transaction.find(f).populate('userId', 'name userId email').lean();
    for (const t of docs as any[]) all.push({ ...t, txType: 'withdrawal', txAmount: t.amount, txDate: t.createdAt });
  }

  if (typesToFetch.includes('swp_purchase')) {
    const f: Record<string, unknown> = { ...dateFilter };
    if (userObjectId) f.userId = userObjectId;
    const docs = await SwpPurchase.find(f).populate('userId', 'name userId email').lean();
    for (const t of docs as any[]) all.push({ ...t, txType: 'swp_purchase', txAmount: t.amount, txDate: t.createdAt });
  }

  if (typesToFetch.includes('investment')) {
    const f: Record<string, unknown> = { ...dateFilter };
    if (userObjectId) f.userId = userObjectId;
    const docs = await Investment.find(f).populate('userId', 'name userId email').lean();
    for (const t of docs as any[]) all.push({ ...t, txType: 'investment', txAmount: t.amount, txDate: t.createdAt });
  }

  all.sort((a, b) => new Date(b.txDate).getTime() - new Date(a.txDate).getTime());
  const totalDocs = all.length;
  const data = all.slice(skip, skip + limit);

  return ApiResponse.paginated(res, 'Transactions retrieved', data, { page, limit, totalDocs, totalPages: Math.ceil(totalDocs / limit), skip });
});

export const getLayeredRewards = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { userId, level } = req.query as any;
  const filter: Record<string, unknown> = {};
  addDateFilter(filter, req.query);

  if (userId) {
    const id = await resolveUserId(userId);
    if (!id) return ApiResponse.paginated(res, 'Layered rewards retrieved', [], { page, limit, totalDocs: 0, totalPages: 0, skip });
    filter.earnerId = id;
  }
  if (level) filter.level = parseInt(level, 10);

  const [docs, totalDocs] = await Promise.all([
    Commission.find(filter).populate('earnerId', 'name userId').populate('fromUserId', 'name userId').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Commission.countDocuments(filter),
  ]);

  return ApiResponse.paginated(res, 'Layered rewards retrieved', docs, { page, limit, totalDocs, totalPages: Math.ceil(totalDocs / limit), skip });
});

export const getRankRewards = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { userId } = req.query as any;
  const filter: Record<string, unknown> = {};
  addDateFilter(filter, req.query);

  if (userId) {
    const id = await resolveUserId(userId);
    if (!id) return ApiResponse.paginated(res, 'Rank rewards retrieved', [], { page, limit, totalDocs: 0, totalPages: 0, skip });
    filter.userId = id;
  }

  const [docs, totalDocs] = await Promise.all([
    RankReward.find(filter).populate('userId', 'name userId').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    RankReward.countDocuments(filter),
  ]);

  return ApiResponse.paginated(res, 'Rank rewards retrieved', docs, { page, limit, totalDocs, totalPages: Math.ceil(totalDocs / limit), skip });
});

export const getSwpPackages = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { userId, purchaseType } = req.query as any;
  const filter: Record<string, unknown> = {};
  addDateFilter(filter, req.query);

  if (userId) {
    const id = await resolveUserId(userId);
    if (!id) return ApiResponse.paginated(res, 'SWP packages retrieved', [], { page, limit, totalDocs: 0, totalPages: 0, skip });
    filter.userId = id;
  }
  if (purchaseType) filter.purchaseType = purchaseType;

  const [docs, totalDocs] = await Promise.all([
    SwpPurchase.find(filter).populate('userId', 'name userId email').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    SwpPurchase.countDocuments(filter),
  ]);

  return ApiResponse.paginated(res, 'SWP packages retrieved', docs, { page, limit, totalDocs, totalPages: Math.ceil(totalDocs / limit), skip });
});

export const getTradingCapitalProfit = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { userId } = req.query as any;
  const filter: Record<string, unknown> = {};
  addDateFilter(filter, req.query);

  if (userId) {
    const id = await resolveUserId(userId);
    if (!id) return ApiResponse.paginated(res, 'Trading capital profit retrieved', [], { page, limit, totalDocs: 0, totalPages: 0, skip });
    filter.userId = id;
  }

  const [docs, totalDocs] = await Promise.all([
    RoiHistory.find(filter).populate('userId', 'name userId').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    RoiHistory.countDocuments(filter),
  ]);

  return ApiResponse.paginated(res, 'Trading capital profit retrieved', docs, { page, limit, totalDocs, totalPages: Math.ceil(totalDocs / limit), skip });
});

export const getMultilevelRewards = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { userId, level } = req.query as any;
  const filter: Record<string, unknown> = {};
  addDateFilter(filter, req.query);

  if (userId) {
    const id = await resolveUserId(userId);
    if (!id) return ApiResponse.paginated(res, 'Multilevel rewards retrieved', [], { page, limit, totalDocs: 0, totalPages: 0, skip });
    filter.earnerId = id;
  }
  if (level) filter.level = parseInt(level, 10);

  const [docs, totalDocs] = await Promise.all([
    MultiLevelReward.find(filter).populate('earnerId', 'name userId').populate('fromUserId', 'name userId').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    MultiLevelReward.countDocuments(filter),
  ]);

  return ApiResponse.paginated(res, 'Multilevel rewards retrieved', docs, { page, limit, totalDocs, totalPages: Math.ceil(totalDocs / limit), skip });
});

export const getRoyaltyRewards = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { userId } = req.query as any;
  const filter: Record<string, unknown> = {};
  addDateFilter(filter, req.query);

  if (userId) {
    const id = await resolveUserId(userId);
    if (!id) return ApiResponse.paginated(res, 'Royalty rewards retrieved', [], { page, limit, totalDocs: 0, totalPages: 0, skip });
    filter.userId = id;
  }

  const [docs, totalDocs] = await Promise.all([
    RankBonusReward.find(filter).populate('userId', 'name userId').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    RankBonusReward.countDocuments(filter),
  ]);

  return ApiResponse.paginated(res, 'Royalty rewards retrieved', docs, { page, limit, totalDocs, totalPages: Math.ceil(totalDocs / limit), skip });
});

export const getSpecialRewards = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { userId } = req.query as any;
  const filter: Record<string, unknown> = {};
  addDateFilter(filter, req.query);

  if (userId) {
    const id = await resolveUserId(userId);
    if (!id) return ApiResponse.paginated(res, 'Special rewards retrieved', [], { page, limit, totalDocs: 0, totalPages: 0, skip });
    filter.userId = id;
  }

  const [docs, totalDocs] = await Promise.all([
    SpecialReward.find(filter).populate('userId', 'name userId').populate('grantedBy', 'name userId').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    SpecialReward.countDocuments(filter),
  ]);

  return ApiResponse.paginated(res, 'Special rewards retrieved', docs, { page, limit, totalDocs, totalPages: Math.ceil(totalDocs / limit), skip });
});

export const getPoolRewards = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { userId } = req.query as any;
  const filter: Record<string, unknown> = {};
  addDateFilter(filter, req.query);

  if (userId) {
    const id = await resolveUserId(userId);
    if (!id) return ApiResponse.paginated(res, 'Pool rewards retrieved', [], { page, limit, totalDocs: 0, totalPages: 0, skip });
    filter.userId = id;
  }

  const [docs, totalDocs] = await Promise.all([
    PoolReward.find(filter).populate('userId', 'name userId').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    PoolReward.countDocuments(filter),
  ]);

  return ApiResponse.paginated(res, 'Pool rewards retrieved', docs, { page, limit, totalDocs, totalPages: Math.ceil(totalDocs / limit), skip });
});

export const getManagementFund = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { userId } = req.query as any;
  const filter: Record<string, unknown> = {};
  addDateFilter(filter, req.query);

  if (userId) {
    const id = await resolveUserId(userId);
    if (!id) return ApiResponse.paginated(res, 'Management fund history retrieved', [], { page, limit, totalDocs: 0, totalPages: 0, skip });
    filter.userId = id;
  }

  const [docs, totalDocs] = await Promise.all([
    FundHistory.find(filter).populate('userId', 'name userId').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    FundHistory.countDocuments(filter),
  ]);

  const data = (docs as any[]).map(d => ({ _id: d._id, userId: d.userId, swpPurchaseAmount: d.swpPurchaseAmount, managementFund: d.managementFund, createdAt: d.createdAt }));

  return ApiResponse.paginated(res, 'Management fund history retrieved', data, { page, limit, totalDocs, totalPages: Math.ceil(totalDocs / limit), skip });
});

export const getOperationFund = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { userId } = req.query as any;
  const filter: Record<string, unknown> = {};
  addDateFilter(filter, req.query);

  if (userId) {
    const id = await resolveUserId(userId);
    if (!id) return ApiResponse.paginated(res, 'Operation fund history retrieved', [], { page, limit, totalDocs: 0, totalPages: 0, skip });
    filter.userId = id;
  }

  const [docs, totalDocs] = await Promise.all([
    FundHistory.find(filter).populate('userId', 'name userId').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    FundHistory.countDocuments(filter),
  ]);

  const data = (docs as any[]).map(d => ({ _id: d._id, userId: d.userId, swpPurchaseAmount: d.swpPurchaseAmount, operationWalletFund: d.operationWalletFund, createdAt: d.createdAt }));

  return ApiResponse.paginated(res, 'Operation fund history retrieved', data, { page, limit, totalDocs, totalPages: Math.ceil(totalDocs / limit), skip });
});

export const getAllMembers = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { search, isBlocked } = req.query as any;
  const filter: Record<string, unknown> = { role: { $ne: 'admin' } };
  addDateFilter(filter, req.query);

  if (isBlocked !== undefined) filter.isBlocked = isBlocked === 'true';
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { userId: { $regex: search, $options: 'i' } },
    ];
  }

  const [docs, totalDocs] = await Promise.all([
    User.find(filter).select('name userId email swpBalance totalInvested walletBalance isBlocked createdAt').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  return ApiResponse.paginated(res, 'All members retrieved', docs, { page, limit, totalDocs, totalPages: Math.ceil(totalDocs / limit), skip });
});

export const getApprovedWithdrawals = catchAsync(async (req: Request, res: Response) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { userId } = req.query as any;
  const filter: Record<string, unknown> = { status: 'completed', type: 'withdrawal' };
  addDateFilter(filter, req.query);

  if (userId) {
    const id = await resolveUserId(userId);
    if (!id) return ApiResponse.paginated(res, 'Approved withdrawals retrieved', [], { page, limit, totalDocs: 0, totalPages: 0, skip });
    filter.userId = id;
  }

  const [docs, totalDocs] = await Promise.all([
    Transaction.find(filter).populate('userId', 'name userId email').populate('approvedBy', 'name userId').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Transaction.countDocuments(filter),
  ]);

  return ApiResponse.paginated(res, 'Approved withdrawals retrieved', docs, { page, limit, totalDocs, totalPages: Math.ceil(totalDocs / limit), skip });
});
