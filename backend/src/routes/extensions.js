import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../services/auth.js';
import { writeAuditLog } from '../services/audit.js';

export const extensionsRouter = Router();

extensionsRouter.use(requireAuth);

extensionsRouter.post('/', requireRole(['employee', 'manager']), async (req, res) => {
  const {
    plan_id,
    requested_duration,
    reason_category,
    reason_text,
    progress_snapshot,
    expected_new_end_date
  } = req.body;
  const { rows } = await query(
    `INSERT INTO extension_requests
     (plan_id, requested_by, requested_duration, reason_category, reason_text, progress_snapshot, expected_new_end_date, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending')
     RETURNING *`,
    [
      plan_id,
      req.user.id,
      requested_duration,
      reason_category,
      reason_text,
      progress_snapshot,
      expected_new_end_date
    ]
  );
  await writeAuditLog(req.user.id, 'extension.request', `Requested extension ${rows[0].id}`);
  return res.status(201).json(rows[0]);
});

extensionsRouter.post('/:id/approve', requireRole(['manager']), async (req, res) => {
  const { manager_notes, approved_duration, expected_new_end_date } = req.body;
  const { rows } = await query(
    `UPDATE extension_requests
     SET status = 'Approved', manager_notes = $1, decided_by = $2, decided_at = NOW(),
         approved_duration = COALESCE($3, requested_duration), expected_new_end_date = COALESCE($4, expected_new_end_date)
     WHERE id = $5
     RETURNING *`,
    [manager_notes, req.user.id, approved_duration, expected_new_end_date, req.params.id]
  );
  const extension = rows[0];
  if (!extension) {
    return res.status(404).json({ error: 'Extension request not found' });
  }
  await query(
    `UPDATE plans SET expected_end_date = $1, total_estimated_duration = total_estimated_duration + $2
     WHERE id = $3`,
    [extension.expected_new_end_date, extension.approved_duration, extension.plan_id]
  );
  await writeAuditLog(req.user.id, 'extension.approve', `Approved extension ${extension.id}`);
  return res.json(extension);
});

extensionsRouter.post('/:id/reject', requireRole(['manager']), async (req, res) => {
  const { manager_notes } = req.body;
  const { rows } = await query(
    `UPDATE extension_requests
     SET status = 'Rejected', manager_notes = $1, decided_by = $2, decided_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [manager_notes, req.user.id, req.params.id]
  );
  if (!rows[0]) {
    return res.status(404).json({ error: 'Extension request not found' });
  }
  await writeAuditLog(req.user.id, 'extension.reject', `Rejected extension ${rows[0].id}`);
  return res.json(rows[0]);
});
