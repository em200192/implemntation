import test from 'node:test';
import assert from 'node:assert/strict';
import { hashOtp, validateOtpInput } from '../src/services/otp.js';

test('validateOtpInput accepts matching otp within limits', () => {
  const otp = '123456';
  const otpLog = {
    otp_code_hash: hashOtp(otp),
    attempts: 0,
    status: 'Sent',
    expires_at: new Date(Date.now() + 60_000).toISOString()
  };
  const result = validateOtpInput({ otp, otpLog });
  assert.equal(result.valid, true);
});

test('validateOtpInput rejects expired otp', () => {
  const otp = '123456';
  const otpLog = {
    otp_code_hash: hashOtp(otp),
    attempts: 0,
    status: 'Sent',
    expires_at: new Date(Date.now() - 60_000).toISOString()
  };
  const result = validateOtpInput({ otp, otpLog });
  assert.equal(result.valid, false);
  assert.equal(result.error, 'OTP expired');
  assert.equal(result.status, 'Expired');
});
