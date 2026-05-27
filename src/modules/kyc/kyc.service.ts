import { Types } from 'mongoose';
import ApiError from '../../utils/ApiError';
import Kyc, { KycStatus } from '../../models/Kyc';
import User from '../../models/User';

class KycService {
  async submit(
    userId: Types.ObjectId,
    data: {
      documentType: string;
      documentNumber: string;
      documentImage: string;
    },
  ) {
    const user = await User.findById(userId);
    if (!user) throw ApiError.notFound('User not found');

    if (user.kycStatus === 'approved') {
      throw ApiError.badRequest('KYC already approved');
    }

    // If pending submission exists, reject resubmission
    const existing = await Kyc.findOne({ userId, status: 'pending' });
    if (existing) {
      throw ApiError.badRequest('KYC already submitted and pending review');
    }

    const kyc = await Kyc.create({
      userId,
      documentType: data.documentType,
      documentNumber: data.documentNumber,
      documentImage: data.documentImage,
      status: 'pending',
    });

    user.kycStatus = 'pending';
    await user.save();

    return kyc;
  }

  async getStatus(userId: Types.ObjectId) {
    const user = await User.findById(userId).select('kycStatus');
    if (!user) throw ApiError.notFound('User not found');

    const kyc = await Kyc.findOne({ userId }).sort({ createdAt: -1 }).lean();

    return {
      kycStatus: user.kycStatus,
      submission: kyc || null,
    };
  }

  async adminList(query: { page?: number; limit?: number; status?: string }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;

    const [submissions, totalDocs, pending, approved, rejected] = await Promise.all([
      Kyc.find(filter)
        .populate('userId', 'name email userId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Kyc.countDocuments(filter),
      Kyc.countDocuments({ status: 'pending' }),
      Kyc.countDocuments({ status: 'approved' }),
      Kyc.countDocuments({ status: 'rejected' }),
    ]);

    return {
      summary: { total: pending + approved + rejected, pending, approved, rejected },
      submissions,
      pagination: { page, limit, totalDocs, totalPages: Math.ceil(totalDocs / limit) },
    };
  }

  async review(
    kycId: string,
    adminId: Types.ObjectId,
    data: { status: 'approved' | 'rejected'; rejectionReason?: string },
  ) {
    const kyc = await Kyc.findById(kycId);
    if (!kyc) throw ApiError.notFound('KYC submission not found');
    if (kyc.status !== 'pending') {
      throw ApiError.badRequest(`KYC is already ${kyc.status}`);
    }

    kyc.status = data.status as KycStatus;
    kyc.reviewedBy = adminId;
    kyc.reviewedAt = new Date();
    if (data.status === 'rejected') {
      kyc.rejectionReason = data.rejectionReason || null;
    }
    await kyc.save();

    // Update user's kycStatus
    await User.findByIdAndUpdate(kyc.userId, { kycStatus: data.status });

    return kyc;
  }
}

export default new KycService();
