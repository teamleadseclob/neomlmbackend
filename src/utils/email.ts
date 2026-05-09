import nodemailer from 'nodemailer';
import env from '../config/env';
import logger from '../config/logger';

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.port === 465,
  auth: {
    user: env.smtp.user,
    pass: env.smtp.pass,
  },
});

export const sendOtpEmail = async (to: string, otp: string): Promise<void> => {
  const mailOptions = {
    from: `"${env.smtp.fromName}" <${env.smtp.fromEmail}>`,
    to,
    subject: 'NEO MLM — Email Verification OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1e293b; margin-bottom: 16px;">Email Verification</h2>
        <p style="color: #475569; font-size: 15px;">Your OTP for registration is:</p>
        <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1e293b;">${otp}</span>
        </div>
        <p style="color: #475569; font-size: 14px;">This OTP expires in <strong>${env.otp.expiryMinutes} minutes</strong>.</p>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">If you didn't request this, please ignore this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info({ to }, 'OTP email sent');
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ to, error: msg }, 'Failed to send OTP email');
    throw new Error(`Failed to send OTP email: ${msg}`);
  }
};

export const generateOtp = (): string => {
  const digits = env.otp.length;
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
};

export const sendReferralEmail = async (to: string, referrerName: string, referralLink: string): Promise<void> => {
  const mailOptions = {
    from: `"${env.smtp.fromName}" <${env.smtp.fromEmail}>`,
    to,
    subject: `${referrerName} invited you to join NEO MLM`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1e293b; margin-bottom: 16px;">You're Invited!</h2>
        <p style="color: #475569; font-size: 15px;"><strong>${referrerName}</strong> has invited you to join NEO MLM.</p>
        <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <a href="${referralLink}" style="display: inline-block; background: #1e293b; color: #fff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: 600;">Join Now</a>
        </div>
        <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">Or copy this link: <a href="${referralLink}">${referralLink}</a></p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info({ to }, 'Referral email sent');
  } catch (error) {
    logger.error({ to, error }, 'Failed to send referral email');
    throw new Error('Failed to send referral email. Please try again.');
  }
};
