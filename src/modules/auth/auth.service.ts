import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import ApiError from '../../utils/ApiError';
import { generateUserId } from '../../utils/helpers';
import { generateOtp, sendOtpEmail } from '../../utils/email';
import env from '../../config/env';
import authRepository from './auth.repository';
import Network from '../../models/Network';
import PendingRegistration from '../../models/PendingRegistration';
import { RegisterInput, LoginInput, AuthResult } from '../../types';

const MAX_OTP_ATTEMPTS = 5;

class AuthService {
  /**
   * Step 1: Validate registration data, send OTP to email.
   * Does NOT create the user yet.
   */
  async register({ name, email, password, sponsorId }: RegisterInput): Promise<{ message: string; email: string }> {
    const emailTaken = await authRepository.emailExists(email);
    if (emailTaken) throw ApiError.conflict('Email is already registered');

    if (sponsorId) {
      const sponsor = await authRepository.findByUserId(sponsorId);
      if (!sponsor) throw ApiError.badRequest('Invalid sponsor ID');
    }

    // Hash password before storing in pending (so we don't store plain text)
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + env.otp.expiryMinutes * 60 * 1000);

    // Remove any existing pending registration for this email
    await PendingRegistration.deleteMany({ email });

    // Store pending registration with OTP
    await PendingRegistration.create({
      name,
      email,
      password: hashedPassword,
      sponsorId: sponsorId ?? null,
      otp,
      otpExpiresAt,
    });

    // Send OTP email
    await sendOtpEmail(email, otp);

    return {
      message: `OTP sent to ${email}. Expires in ${env.otp.expiryMinutes} minutes.`,
      email,
    };
  }

  /**
   * Step 2: Verify OTP and create the user.
   */
  async verifyOtp(email: string, otp: string): Promise<AuthResult> {
    const pending = await PendingRegistration.findOne({ email });
    if (!pending) throw ApiError.badRequest('No pending registration found. Please register again.');

    // Check expiry
    if (new Date() > pending.otpExpiresAt) {
      await PendingRegistration.deleteMany({ email });
      throw ApiError.badRequest('OTP has expired. Please register again.');
    }

    // Check attempts
    if (pending.attempts >= MAX_OTP_ATTEMPTS) {
      await PendingRegistration.deleteMany({ email });
      throw ApiError.badRequest('Too many failed attempts. Please register again.');
    }

    // Verify OTP
    if (pending.otp !== otp) {
      pending.attempts += 1;
      await pending.save();
      const remaining = MAX_OTP_ATTEMPTS - pending.attempts;
      throw ApiError.badRequest(`Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`);
    }

    // OTP correct — check email not taken (race condition guard)
    const emailTaken = await authRepository.emailExists(email);
    if (emailTaken) {
      await PendingRegistration.deleteMany({ email });
      throw ApiError.conflict('Email is already registered');
    }

    // Generate unique userId
    let userId: string;
    let isUnique = false;
    while (!isUnique) {
      userId = generateUserId();
      const existing = await authRepository.findByUserId(userId);
      if (!existing) isUnique = true;
    }

    // Create user (password is already hashed)
    const user = await authRepository.createUserWithHashedPassword({
      name: pending.name,
      email: pending.email,
      password: pending.password,
      userId: userId!,
      sponsorId: pending.sponsorId,
    });

    // Create network node
    let sponsor = null;
    if (pending.sponsorId) {
      sponsor = await authRepository.findByUserId(pending.sponsorId);
    }

    const sponsorNode = sponsor
      ? await Network.findOne({ userId: sponsor._id })
      : null;

    await Network.create({
      userId: user._id,
      parentId: sponsor?._id ?? null,
      level: sponsorNode ? sponsorNode.level + 1 : 0,
    });

    // Clean up pending registration
    await PendingRegistration.deleteMany({ email });

    const token = this.generateToken(user._id);

    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        userId: user.userId,
        role: user.role,
      },
      token,
    };
  }

  /**
   * Resend OTP for a pending registration.
   */
  async resendOtp(email: string): Promise<{ message: string; email: string }> {
    const pending = await PendingRegistration.findOne({ email });
    if (!pending) throw ApiError.badRequest('No pending registration found. Please register again.');

    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + env.otp.expiryMinutes * 60 * 1000);

    pending.otp = otp;
    pending.otpExpiresAt = otpExpiresAt;
    pending.attempts = 0;
    await pending.save();

    await sendOtpEmail(email, otp);

    return {
      message: `OTP resent to ${email}. Expires in ${env.otp.expiryMinutes} minutes.`,
      email,
    };
  }

  async login({ userId, password }: LoginInput): Promise<AuthResult> {
    const user = await authRepository.findByUserIdWithPassword(userId);
    if (!user) throw ApiError.unauthorized('Invalid referral ID or password');
    if (user.isBlocked) throw ApiError.forbidden('Your account has been blocked. Contact admin.');

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw ApiError.unauthorized('Invalid referral ID or password');

    const token = this.generateToken(user._id);

    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        userId: user.userId,
        role: user.role,
      },
      token,
    };
  }

  private generateToken(userId: Types.ObjectId): string {
    return jwt.sign({ id: userId }, env.jwt.secret, {
      expiresIn: env.jwt.expiresIn,
    } as jwt.SignOptions);
  }
}

export default new AuthService();
