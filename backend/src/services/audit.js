import { query } from '../db.js';

export const writeAuditLog = async (userId, action, details) => {
  await query(
    'INSERT INTO audit_logs (user_id, action, details, created_at) VALUES ($1, $2, $3, NOW())',
    [userId, action, details]
  );
};
