import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../services/auth.js';

export const reportsRouter = Router();

reportsRouter.use(requireAuth, requireRole(['manager']));

reportsRouter.get('/plans', async (req, res) => {
  const { rows } = await query(
    `SELECT plans.id, clients.name AS client_name, plans.total_estimated_duration,
            COALESCE(SUM(session_progress_logs.actual_time_spent), 0) AS actual_time_spent,
            AVG(plan_stages.progress_percent) AS avg_progress
     FROM plans
     JOIN clients ON plans.client_id = clients.id
     LEFT JOIN plan_stages ON plan_stages.plan_id = plans.id
     LEFT JOIN work_sessions ON work_sessions.plan_id = plans.id
     LEFT JOIN session_progress_logs ON session_progress_logs.work_session_id = work_sessions.id
     GROUP BY plans.id, clients.name, plans.total_estimated_duration
     ORDER BY plans.id DESC`
  );
  return res.json(rows);
});

reportsRouter.get('/staff', async (req, res) => {
  const { rows } = await query(
    `SELECT users.id, users.name, users.role,
            COUNT(DISTINCT work_sessions.id) AS sessions_count,
            COALESCE(SUM(session_progress_logs.actual_time_spent), 0) AS actual_time_spent
     FROM users
     LEFT JOIN work_sessions ON work_sessions.employee_id = users.id
     LEFT JOIN session_progress_logs ON session_progress_logs.work_session_id = work_sessions.id
     WHERE users.role IN ('employee', 'manager')
     GROUP BY users.id, users.name, users.role
     ORDER BY users.name`
  );
  return res.json(rows);
});
