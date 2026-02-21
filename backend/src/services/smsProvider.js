import { query } from '../db.js';

export const sendSms = async ({ to, message, channel = 'sms' }) => {
  await query(
    `INSERT INTO message_logs (sent_to, message, channel, sent_at)
     VALUES ($1, $2, $3, NOW())`,
    [to, message, channel]
  );
  console.log(`[MockSMS] to=${to} channel=${channel} message=${message}`);
};
