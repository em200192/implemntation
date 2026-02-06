import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { requireAuth, requireRole } from '../services/auth.js';
import { writeAuditLog } from '../services/audit.js';
import { buildPlanApproval } from '../services/workflow.js';

export const approvalsRouter = Router();

approvalsRouter.use(requireAuth, requireRole(['manager']));

approvalsRouter.get('/queue', async (req, res) => {
  const plans = await query(
    `SELECT plans.*, clients.name AS client_name
     FROM plans
     JOIN clients ON plans.client_id = clients.id
     WHERE plans.status = 'PendingApproval'
     ORDER BY plans.submitted_at`
  );
  const extensions = await query(
    `SELECT extension_requests.*, clients.name AS client_name
     FROM extension_requests
     JOIN plans ON extension_requests.plan_id = plans.id
     JOIN clients ON plans.client_id = clients.id
     WHERE extension_requests.status = 'Pending'
     ORDER BY extension_requests.created_at`
  );
  return res.json({ plans: plans.rows, extensions: extensions.rows });
});

approvalsRouter.post('/plans/:id/approve', async (req, res) => {
  const approval = buildPlanApproval({ action: 'approve' });
  const { rows } = await query(
    `UPDATE plans
     SET status = $1, approved_by = $2, approved_at = NOW(), manager_notes = $3
     WHERE id = $4
     RETURNING *`,
    [approval.status, req.user.id, approval.manager_notes, req.params.id]
  );
  if (!rows[0]) {
    return res.status(404).json({ error: 'Plan not found' });
  }
  await writeAuditLog(req.user.id, 'plan.approve', `Approved plan ${rows[0].id}`);
  return res.json(rows[0]);
});

approvalsRouter.post('/plans/:id/reject', async (req, res) => {
  const { reason } = req.body;
  const approval = buildPlanApproval({ action: 'reject', reason });
  const { rows } = await query(
    `UPDATE plans
     SET status = $1, manager_notes = $2, approved_by = $3, approved_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [approval.status, approval.manager_notes, req.user.id, req.params.id]
  );
  if (!rows[0]) {
    return res.status(404).json({ error: 'Plan not found' });
  }
  await writeAuditLog(req.user.id, 'plan.reject', `Rejected plan ${rows[0].id}`);
  return res.json(rows[0]);
});

approvalsRouter.put('/plans/:id', async (req, res) => {
  const { expected_start_date, expected_end_date, stages = [] } = req.body;
  const total_estimated_duration = stages.reduce(
    (sum, stage) => sum + Number(stage.estimated_duration || 0),
    0
  );
  const plan = await withTransaction(async (client) => {
    const planResult = await client.query(
      `UPDATE plans
       SET expected_start_date = $1,
           expected_end_date = $2,
           total_estimated_duration = $3
       WHERE id = $4
       RETURNING *`,
      [expected_start_date, expected_end_date, total_estimated_duration, req.params.id]
    );
    const planRow = planResult.rows[0];
    await client.query('DELETE FROM plan_stages WHERE plan_id = $1', [req.params.id]);
    for (const stage of stages) {
      await client.query(
        `INSERT INTO plan_stages
         (plan_id, name, description, estimated_duration, order_no, progress_percent, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          planRow.id,
          stage.name,
          stage.description,
          stage.estimated_duration,
          stage.order_no,
          stage.progress_percent || 0,
          stage.status || 'Pending'
        ]
      );
    }
    return planRow;
  });

  if (!plan) {
    return res.status(404).json({ error: 'Plan not found' });
  }
  await writeAuditLog(req.user.id, 'plan.edit', `Edited plan ${plan.id}`);
  return res.json(plan);
});
