import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { requireAuth, requireRole } from '../services/auth.js';
import { writeAuditLog } from '../services/audit.js';

export const plansRouter = Router();

plansRouter.use(requireAuth);

plansRouter.get('/', async (req, res) => {
  const { rows } = await query(
    `SELECT plans.*, clients.name AS client_name, users.name AS created_by_name
     FROM plans
     JOIN clients ON plans.client_id = clients.id
     JOIN users ON plans.created_by = users.id
     ORDER BY plans.created_at DESC`
  );
  return res.json(rows);
});

plansRouter.post('/', requireRole(['employee', 'manager']), async (req, res) => {
  const { client_id, expected_start_date, expected_end_date, stages = [] } = req.body;
  const total_estimated_duration = stages.reduce(
    (sum, stage) => sum + Number(stage.estimated_duration || 0),
    0
  );
  const plan = await withTransaction(async (client) => {
    const planResult = await client.query(
      `INSERT INTO plans
       (client_id, created_by, status, total_estimated_duration, expected_start_date, expected_end_date)
       VALUES ($1, $2, 'Draft', $3, $4, $5)
       RETURNING *`,
      [client_id, req.user.id, total_estimated_duration, expected_start_date, expected_end_date]
    );
    const planRow = planResult.rows[0];
    for (const stage of stages) {
      await client.query(
        `INSERT INTO plan_stages
         (plan_id, name, description, estimated_duration, order_no, progress_percent, status)
         VALUES ($1, $2, $3, $4, $5, 0, 'Pending')`,
        [planRow.id, stage.name, stage.description, stage.estimated_duration, stage.order_no]
      );
    }
    return planRow;
  });

  await writeAuditLog(req.user.id, 'plan.create', `Created plan ${plan.id}`);
  return res.status(201).json(plan);
});

plansRouter.get('/:id', async (req, res) => {
  const { rows } = await query('SELECT * FROM plans WHERE id = $1', [req.params.id]);
  const plan = rows[0];
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found' });
  }
  const stages = await query('SELECT * FROM plan_stages WHERE plan_id = $1 ORDER BY order_no', [
    req.params.id
  ]);
  return res.json({ ...plan, stages: stages.rows });
});

plansRouter.post('/:id/submit', requireRole(['employee', 'manager']), async (req, res) => {
  const { rows } = await query(
    `UPDATE plans
     SET status = 'PendingApproval', submitted_at = NOW()
     WHERE id = $1 AND status = 'Draft'
     RETURNING *`,
    [req.params.id]
  );
  if (!rows[0]) {
    return res.status(400).json({ error: 'Plan not in Draft status' });
  }
  await writeAuditLog(req.user.id, 'plan.submit', `Submitted plan ${rows[0].id}`);
  return res.json(rows[0]);
});
