import crypto from 'crypto';

export const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

export const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

export const isOtpExpired = (otpLog) => new Date(otpLog.expires_at) < new Date();

export const validateOtpInput = ({ otp, otpLog }) => {
  if (!otpLog) {
    return { valid: false, error: 'OTP not found' };
  }
  if (otpLog.status === 'Verified') {
    return { valid: false, error: 'OTP already verified' };
  }
  if (otpLog.attempts >= 5) {
    return { valid: false, error: 'Maximum attempts exceeded', status: 'Failed' };
  }
  if (isOtpExpired(otpLog)) {
    return { valid: false, error: 'OTP expired', status: 'Expired' };
  }
  const hashed = hashOtp(otp);
  if (hashed !== otpLog.otp_code_hash) {
    return { valid: false, error: 'Invalid OTP' };
  }
  return { valid: true };
};
