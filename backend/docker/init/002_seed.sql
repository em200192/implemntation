INSERT INTO users (name, email, role, password_hash)
VALUES
  ('Maya Manager', 'manager@example.com', 'manager', 'plain:password123'),
  ('Evan Employee', 'employee1@example.com', 'employee', 'plain:password123'),
  ('Ivy Implementer', 'employee2@example.com', 'employee', 'plain:password123');

INSERT INTO clients (name, contact_person, phone, email)
VALUES
  ('Acme Accounting', 'Jordan Fields', '+15550001111', 'jordan@acme.com'),
  ('LedgerWorks', 'Casey Smith', '+15550002222', 'casey@ledgerworks.com');

INSERT INTO plans (client_id, created_by, status, total_estimated_duration, expected_start_date, expected_end_date)
VALUES
  (1, 2, 'Approved', 40, CURRENT_DATE, CURRENT_DATE + INTERVAL '10 days'),
  (2, 3, 'PendingApproval', 32, CURRENT_DATE, CURRENT_DATE + INTERVAL '8 days');

INSERT INTO plan_stages (plan_id, name, description, estimated_duration, order_no, progress_percent, status)
VALUES
  (1, 'Discovery', 'Requirements gathering and data audit', 8, 1, 25, 'InProgress'),
  (1, 'Configuration', 'System setup and chart of accounts', 16, 2, 10, 'Pending'),
  (1, 'Training', 'Staff onboarding', 16, 3, 0, 'Pending'),
  (2, 'Kickoff', 'Project kickoff and timeline validation', 8, 1, 0, 'Pending'),
  (2, 'Migration', 'Data migration', 16, 2, 0, 'Pending'),
  (2, 'Go-live', 'Final validation', 8, 3, 0, 'Pending');
