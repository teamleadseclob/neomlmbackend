import { Types } from 'mongoose';
import MarketInterest from '../../models/MarketInterest';
import ApiError from '../../utils/ApiError';

class MarketService {
  async expressInterest(userId: Types.ObjectId, marketTitle: string) {
    const existing = await MarketInterest.findOne({ userId, marketTitle });
    if (existing) {
      throw ApiError.badRequest(`You have already expressed interest in this ${marketTitle} market`);
    }
    return MarketInterest.create({ userId, marketTitle });
  }

  async getUserInterests(userId: Types.ObjectId) {
    return MarketInterest.find({ userId }).sort({ createdAt: -1 }).lean();
  }

  async acceptInterest(id: string, url: string) {
    const interest = await MarketInterest.findById(id);
    if (!interest) throw ApiError.notFound('Market interest not found');
    if (interest.status === 'accepted') throw ApiError.conflict('Already accepted');

    interest.status = 'accepted';
    interest.url = url;
    await interest.save();
    return interest;
  }

  async adminList(query: { page?: number; limit?: number; marketTitle?: string; status?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.marketTitle) filter.marketTitle = { $regex: query.marketTitle, $options: 'i' };
    if (query.status) filter.status = query.status;

    const [entries, totalDocs] = await Promise.all([
      MarketInterest.find(filter)
        .populate('userId', 'name email userId phoneNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      MarketInterest.countDocuments(filter),
    ]);

    return {
      entries,
      pagination: { page, limit, totalDocs, totalPages: Math.ceil(totalDocs / limit) },
    };
  }
}

export default new MarketService();
