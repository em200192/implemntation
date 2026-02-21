CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('employee', 'manager')),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_by INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('Draft', 'PendingApproval', 'Approved', 'Rejected', 'InProgress', 'Completed', 'OnHold')),
  total_estimated_duration NUMERIC(10,2) NOT NULL DEFAULT 0,
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP,
  expected_start_date DATE,
  expected_end_date DATE,
  submitted_at TIMESTAMP,
  manager_notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plan_stages (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  estimated_duration NUMERIC(10,2) NOT NULL DEFAULT 0,
  order_no INTEGER NOT NULL,
  progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('Pending', 'InProgress', 'Completed'))
);

CREATE TABLE IF NOT EXISTS work_sessions (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES users(id),
  session_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PendingOTP', 'Started', 'Completed', 'Cancelled')),
  server_start_time TIMESTAMP,
  server_end_time TIMESTAMP
);

CREATE TABLE IF NOT EXISTS otp_logs (
  id SERIAL PRIMARY KEY,
  work_session_id INTEGER NOT NULL REFERENCES work_sessions(id) ON DELETE CASCADE,
  otp_code_hash TEXT NOT NULL,
  sent_to_phone TEXT,
  sent_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified_at TIMESTAMP,
  attempts INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS session_progress_logs (
  id SERIAL PRIMARY KEY,
  work_session_id INTEGER NOT NULL REFERENCES work_sessions(id) ON DELETE CASCADE,
  stage_id INTEGER REFERENCES plan_stages(id),
  note TEXT,
  actual_time_spent NUMERIC(10,2) NOT NULL DEFAULT 0,
  blockers TEXT,
  attachments TEXT,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_summaries (
  id SERIAL PRIMARY KEY,
  work_session_id INTEGER NOT NULL REFERENCES work_sessions(id) ON DELETE CASCADE,
  completed_today TEXT NOT NULL,
  pending_next TEXT NOT NULL,
  blockers TEXT NOT NULL,
  next_visit_datetime TIMESTAMP
);

CREATE TABLE IF NOT EXISTS extension_requests (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  requested_by INTEGER NOT NULL REFERENCES users(id),
  requested_duration NUMERIC(10,2) NOT NULL,
  approved_duration NUMERIC(10,2),
  reason_category TEXT NOT NULL,
  reason_text TEXT NOT NULL,
  progress_snapshot TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  manager_notes TEXT,
  expected_new_end_date DATE,
  decided_by INTEGER REFERENCES users(id),
  decided_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS message_logs (
  id SERIAL PRIMARY KEY,
  sent_to TEXT NOT NULL,
  message TEXT NOT NULL,
  channel TEXT NOT NULL,
  sent_at TIMESTAMP NOT NULL
);
