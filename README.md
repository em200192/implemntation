# Implementation Tracker (Single-Tenant)

A single-organization web application for managing implementation/installation/onboarding work for accounting software clients. Includes plan creation, manager approvals, OTP-verified on-site sessions, end-of-day summaries, extension requests, reporting, and full audit trail logging.

## Tech Stack
- **Backend:** Node.js + Express (REST API)
- **Frontend:** React + Vite
- **Database:** PostgreSQL
- **Auth:** JWT + Role-based access (Employee/Manager)

## Features
- Client profiles
- Implementation plans with stages and approvals
- OTP-verified session start (server-time authoritative)
- Progress logs and end-of-day summaries sent to clients
- Extension requests and approvals
- Reports: planned vs actual time, staff performance
- Audit log for critical actions

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 13+

### Backend
```bash
cd backend
export DATABASE_URL=postgres://user:password@localhost:5432/implementation_tracker
export JWT_SECRET=change-me
npm install
npm run migrate
npm run seed
npm run dev
```

### Frontend
```bash
cd frontend
export VITE_API_URL=http://localhost:4000
npm install
npm run dev
```

### Docker Compose (backend + frontend + Postgres)
```bash
docker compose up -d db backend frontend
# First-time setup

docker compose run --rm migrate

docker compose run --rm seed
```

### Seeded Accounts
- Manager: `manager@example.com` / `password123`
- Employee: `employee1@example.com` / `password123`
- Employee: `employee2@example.com` / `password123`

## OTP & Messaging
- OTP codes are valid for 10 minutes, with a maximum of 5 attempts.
- Messages are sent through a mock SMS provider that logs entries to the database.

## Tests
```bash
cd backend
npm test
```

## API Overview
- `POST /api/auth/login`
- `GET /api/clients`
- `POST /api/plans`
- `POST /api/plans/:id/submit`
- `POST /api/approvals/plans/:id/approve`
- `POST /api/approvals/plans/:id/reject`
- `POST /api/sessions/start`
- `POST /api/sessions/:id/verify`
- `POST /api/sessions/:id/end`
- `POST /api/extensions`
- `GET /api/reports/plans`
- `GET /api/audit`

