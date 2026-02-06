import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../services/auth.js';

export const auditRouter = Router();

auditRouter.use(requireAuth, requireRole(['manager']));

auditRouter.get('/', async (req, res) => {
  const { rows } = await query(
    `SELECT audit_logs.*, users.name AS user_name
     FROM audit_logs
     LEFT JOIN users ON audit_logs.user_id = users.id
     ORDER BY audit_logs.created_at DESC
     LIMIT 200`
  );
  return res.json(rows);
});
