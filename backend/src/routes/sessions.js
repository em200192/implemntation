import { Router } from 'express';
import { query, withTransaction } from '../db.js';
import { requireAuth, requireRole } from '../services/auth.js';
import { writeAuditLog } from '../services/audit.js';
import { generateOtp, hashOtp, validateOtpInput } from '../services/otp.js';
import { sendSms } from '../services/smsProvider.js';

export const sessionsRouter = Router();

sessionsRouter.use(requireAuth);

sessionsRouter.post('/start', requireRole(['employee', 'manager']), async (req, res) => {
  const { plan_id } = req.body;
  const planResult = await query('SELECT * FROM plans WHERE id = $1', [plan_id]);
  const plan = planResult.rows[0];
  if (!plan || plan.status !== 'Approved') {
    return res.status(400).json({ error: 'Plan must be approved to start a session' });
  }
  const clientResult = await query('SELECT * FROM clients WHERE id = $1', [plan.client_id]);
  const client = clientResult.rows[0];
  const otpCode = generateOtp();
  const otpHash = hashOtp(otpCode);
  const session = await withTransaction(async (clientDb) => {
    const sessionResult = await clientDb.query(
      `INSERT INTO work_sessions
       (plan_id, employee_id, session_date, status)
       VALUES ($1, $2, CURRENT_DATE, 'PendingOTP')
       RETURNING *`,
      [plan_id, req.user.id]
    );
    const workSession = sessionResult.rows[0];
    await clientDb.query(
      `INSERT INTO otp_logs
       (work_session_id, otp_code_hash, sent_to_phone, sent_at, expires_at, attempts, status)
       VALUES ($1, $2, $3, NOW(), NOW() + INTERVAL '10 minutes', 0, 'Sent')`,
      [workSession.id, otpHash, client.phone]
    );
    await clientDb.query(
      `UPDATE plans SET status = 'InProgress' WHERE id = $1 AND status = 'Approved'`,
      [plan_id]
    );
    return workSession;
  });

  await sendSms({
    to: client.phone,
    message: `To confirm start of today's implementation session, your OTP is: ${otpCode}. Valid for 10 minutes.`
  });
  await writeAuditLog(req.user.id, 'session.start.request', `Requested OTP for session ${session.id}`);
  return res.status(201).json({ session_id: session.id, status: session.status });
});

sessionsRouter.post('/:id/verify', requireRole(['employee', 'manager']), async (req, res) => {
  const { otp } = req.body;
  const { rows } = await query('SELECT * FROM otp_logs WHERE work_session_id = $1 ORDER BY sent_at DESC LIMIT 1', [
    req.params.id
  ]);
  const otpLog = rows[0];
  const validation = validateOtpInput({ otp, otpLog });
  if (!validation.valid) {
    if (validation.status) {
      await query('UPDATE otp_logs SET status = $1 WHERE id = $2', [validation.status, otpLog.id]);
    }
    if (validation.error === 'Invalid OTP') {
      await query('UPDATE otp_logs SET attempts = attempts + 1 WHERE id = $1', [otpLog.id]);
    }
    return res.status(400).json({ error: validation.error });
  }

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE otp_logs SET verified_at = NOW(), status = 'Verified', attempts = attempts + 1 WHERE id = $1`,
      [otpLog.id]
    );
    await client.query(
      `UPDATE work_sessions SET status = 'Started', server_start_time = NOW() WHERE id = $1`,
      [req.params.id]
    );
  });

  await writeAuditLog(req.user.id, 'session.start.verify', `Verified OTP for session ${req.params.id}`);
  return res.json({ status: 'Started' });
});

sessionsRouter.post('/:id/progress', requireRole(['employee', 'manager']), async (req, res) => {
  const { stage_id, note, actual_time_spent, blockers, attachments, progress_percent } = req.body;
  const { rows } = await query(
    `INSERT INTO session_progress_logs
     (work_session_id, stage_id, note, actual_time_spent, blockers, attachments, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     RETURNING *`,
    [req.params.id, stage_id || null, note, actual_time_spent, blockers, attachments]
  );
  if (stage_id && progress_percent !== undefined) {
    await query('UPDATE plan_stages SET progress_percent = $1 WHERE id = $2', [
      progress_percent,
      stage_id
    ]);
  }
  await writeAuditLog(req.user.id, 'session.progress', `Progress log ${rows[0].id} for session ${req.params.id}`);
  return res.status(201).json(rows[0]);
});

sessionsRouter.post('/:id/end', requireRole(['employee', 'manager']), async (req, res) => {
  const { completed_today, pending_next, blockers, next_visit_datetime } = req.body;
  if (!completed_today || !pending_next || !blockers) {
    return res.status(400).json({ error: 'Missing required summary fields' });
  }
  const sessionResult = await query('SELECT * FROM work_sessions WHERE id = $1', [req.params.id]);
  const session = sessionResult.rows[0];
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const planResult = await query(
    `SELECT plans.*, clients.phone AS client_phone
     FROM plans
     JOIN clients ON plans.client_id = clients.id
     WHERE plans.id = $1`,
    [session.plan_id]
  );
  const plan = planResult.rows[0];

  await withTransaction(async (client) => {
    await client.query(
      `UPDATE work_sessions SET status = 'Completed', server_end_time = NOW() WHERE id = $1`,
      [req.params.id]
    );
    await client.query(
      `INSERT INTO daily_summaries
       (work_session_id, completed_today, pending_next, blockers, next_visit_datetime)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.params.id, completed_today, pending_next, blockers, next_visit_datetime]
    );
  });

  await sendSms({
    to: plan.client_phone,
    message: `Today's session is completed. Done: ${completed_today}. Remaining: ${pending_next}. Next: ${next_visit_datetime || 'TBD'}.`
  });

  await writeAuditLog(req.user.id, 'session.end', `Ended session ${req.params.id}`);
  return res.json({ status: 'Completed' });
});
