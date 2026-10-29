# FinTrack — Personal Finance Management

> **Reference Only — All Rights Reserved**
>
> This repository is publicly available for portfolio presentation and technical evaluation only. Public visibility does not grant permission to deploy, operate, commercially use, modify, redistribute, or create derivative works from this software. Any additional use requires prior written authorization under the applicable license and subject to applicable law. All rights not expressly granted are reserved.
>
> See [LICENSE](LICENSE). To request permission for additional use, contact majeed.developer0@gmail.com.

A full-stack personal finance management application built as a portfolio project. FinTrack lets users record income and expenses, manage monthly budgets, categorize transactions, and understand their spending through a clean dashboard and reporting views.

---

## Table of Contents

1. [Features](#features)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [Screenshots](#screenshots)
5. [System Requirements](#system-requirements)
6. [Local Installation](#local-installation)
7. [Environment Variables](#environment-variables)
8. [PostgreSQL Setup](#postgresql-setup)
9. [Database Migrations](#database-migrations)
10. [Seed Data](#seed-data)
11. [Running the Application](#running-the-application)
12. [Tests, Lint, and Type Checking](#tests-lint-and-type-checking)
13. [API Documentation](#api-documentation)
14. [Database Schema](#database-schema)
15. [Repository Structure](#repository-structure)
16. [Authentication Design](#authentication-design)
17. [Financial Calculation Rules](#financial-calculation-rules)
18. [Security and Privacy](#security-and-privacy)
19. [Troubleshooting](#troubleshooting)
20. [Deployment](#deployment)
21. [Contributing](#contributing)
22. [License](#license)
23. [Roadmap](#roadmap)
24. [Known Limitations](#known-limitations)

---

## Features

| Area | What is included |
|---|---|
| **Authentication** | Register, login, logout, JWT access + refresh tokens, password change, profile update |
| **Transactions** | Create, read, update, delete with pagination, search, date-range and category filters |
| **Categories** | Per-user income and expense categories with default set seeded on registration |
| **Budgets** | Monthly budget per expense category with real-time spent/remaining/percentage from actual transactions |
| **Dashboard** | Monthly income, expenses, net balance, overall account balance, trend chart, category pie, recent transactions, budget progress |
| **Reports** | Annual monthly summary, category breakdown, date-range transaction report, CSV export |
| **Settings** | Display name, base currency (display-only), password change |

---

## Technology Stack

### Backend
- **Node.js** (v22 LTS) + **TypeScript** (strict)
- **NestJS 10** with **Fastify** adapter
- **Prisma ORM** against **PostgreSQL 16**
- **Argon2id** password hashing
- **JWT** access tokens (15 min) + opaque refresh tokens (7 days)
- **Swagger / OpenAPI** auto-generated from decorators
- **Jest** for unit tests

### Frontend
- **React 18** + **TypeScript** (strict)
- **Vite** for bundling
- **React Router 6**
- **TanStack Query 5** for server state
- **React Hook Form** + **Zod** for validation
- **Tailwind CSS** for styling
- **Recharts** for charts
- **Vitest** + **React Testing Library** for tests

### Development
- **npm workspaces** monorepo
- **Docker Compose** for PostgreSQL (optional; local PostgreSQL works too)
- **GitHub Actions** CI

---

## Architecture Overview

```
Browser ──HTTP──► React SPA (Vite, port 5173)
                      │
                      │  REST /api/v1
                      ▼
             NestJS + Fastify (port 3000)
                      │
                      │  Prisma
                      ▼
                PostgreSQL (port 5432)
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full request lifecycle and module boundary diagram.

---

## Screenshots

> Screenshots will be added once the application is running locally. To capture them, start the app following the steps below, log in with the demo credentials, and take screenshots of the Dashboard, Transactions, Budgets, and Reports pages.

---

## System Requirements

| Tool | Minimum |
|---|---|
| Node.js | 20 (22 LTS recommended) |
| npm | 10 |
| PostgreSQL | 14 |
| Git | 2 |

Docker Desktop is **optional** but simplifies PostgreSQL setup.

---

## Local Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/fintrack.git
cd fintrack

# 2. Copy the environment file
cp .env.example .env

# 3. Install all workspace dependencies
npm install
```

---

## Environment Variables

Edit `.env` and fill in your values.

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://fintrack:fintrack_password@localhost:5432/fintrack_db` |
| `PORT` | API server port | `3000` |
| `NODE_ENV` | `development` / `production` | `development` |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens (min 32 chars) | — |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens (min 32 chars) | — |
| `JWT_ACCESS_EXPIRES_IN` | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL | `7d` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:5173` |
| `VITE_API_BASE_URL` | Frontend API base URL | `http://localhost:3000/api/v1` |

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

---

## PostgreSQL Setup

### Option A — Docker Compose (recommended)

```bash
docker-compose up -d
```

This starts PostgreSQL 16 on port 5432 with credentials from the Compose file. Data persists in a named Docker volume.

### Option B — Local PostgreSQL

1. Create the database and user:

```sql
CREATE USER fintrack WITH PASSWORD 'fintrack_password';
CREATE DATABASE fintrack_db OWNER fintrack;
```

2. Update `DATABASE_URL` in `.env` to match.

---

## Database Migrations

```bash
# Apply all pending migrations (creates the schema)
npm run db:migrate

# If running in CI or production (no prompts)
npm run db:migrate:prod
```

Prisma migration files live in [`prisma/migrations/`](prisma/migrations/).

> **Important:** Never edit an already-applied migration file. Create a new migration for schema changes.

---

## Seed Data

```bash
npm run db:seed
```

This creates:
- A demo user: `demo@fintrack.dev` / `Demo@123456`
- 12 default categories (income and expense)
- 18 sample transactions spread over the past 3 months
- Monthly budgets for the current month

All seeds are idempotent — running them again is safe.

---

## Running the Application

```bash
# Start API and frontend concurrently (requires Bash)
npm run dev

# Or start each individually (works on Windows PowerShell)
npm run dev:api      # http://localhost:3000
npm run dev:web      # http://localhost:5173
```

Once running:
- **Frontend:** http://localhost:5173
- **API:** http://localhost:3000/api/v1
- **Swagger docs:** http://localhost:3000/docs

---

## Tests, Lint, and Type Checking

```bash
# All tests
npm run test

# API tests only (Jest)
npm run test:api

# Frontend tests only (Vitest)
npm run test:web

# TypeScript type check (no emit)
npm run typecheck

# Lint
npm run lint
npm run lint:fix

# Production build
npm run build
```

---

## API Documentation

Swagger UI is available at **http://localhost:3000/docs** when the API is running.

The API follows this response envelope:

```json
// Success
{ "success": true, "data": {}, "meta": {}, "requestId": "uuid" }

// Error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [] }, "requestId": "uuid" }
```

See [`docs/API.md`](docs/API.md) for endpoint reference.

---

## Database Schema

```
┌─────────────────┐     ┌─────────────────┐
│      users      │────<│   categories    │
│─────────────────│     │─────────────────│
│ id (UUID PK)    │     │ id (UUID PK)    │
│ email (unique)  │     │ userId (FK)     │
│ name            │     │ name            │
│ passwordHash    │     │ type            │
│ currency        │     │ color           │
│ createdAt       │     │ icon            │
│ updatedAt       │     │ isDefault       │
└────────┬────────┘     └──────┬──────────┘
         │                     │
         │                     │
    ┌────▼────────────────┐   │
    │    transactions     │◄──┘
    │─────────────────────│
    │ id (UUID PK)        │
    │ userId (FK)         │
    │ categoryId (FK)     │
    │ type                │
    │ amount (NUMERIC)    │
    │ description         │
    │ transactionDate     │
    │ notes               │
    └─────────────────────┘
         │
    ┌────▼────────────────┐
    │      budgets        │
    │─────────────────────│
    │ id (UUID PK)        │
    │ userId (FK)         │
    │ categoryId (FK)     │
    │ amount (NUMERIC)    │
    │ month / year        │
    │ UNIQUE(u,cat,m,y)   │
    └─────────────────────┘
```

See [`docs/DATABASE.md`](docs/DATABASE.md) for full schema documentation.

---

## Repository Structure

```
fintrack/
├── apps/
│   ├── api/                 NestJS + Fastify backend
│   │   └── src/
│   │       ├── common/      Filters, interceptors, middleware, decorators
│   │       ├── config/      App configuration
│   │       ├── database/    PrismaService
│   │       └── modules/     auth, users, categories, transactions, budgets, dashboard, reports
│   └── web/                 React + Vite frontend
│       └── src/
│           ├── app/         Auth context, query client, router
│           ├── components/  Reusable UI components
│           ├── features/    Page-level feature modules
│           ├── layouts/     AppLayout (sidebar + header)
│           ├── lib/         API client, utilities
│           ├── services/    API service layer
│           └── types/       Shared TypeScript types
├── prisma/
│   ├── schema.prisma        Database schema
│   ├── migrations/          Migration history
│   └── seed.ts              Development seed script
├── docs/                    Supporting documentation
├── .github/                 CI workflow, issue and PR templates
├── docker-compose.yml       PostgreSQL container
├── .env.example             Environment variable template
└── package.json             Root workspace config
```

---

## Authentication Design

- Passwords hashed with **Argon2id** (65 536 KB memory, 3 iterations, 4 parallelism).
- Login issues a short-lived **JWT access token** (15 min) and an **opaque refresh token** (7 days).
- Refresh tokens are stored as SHA-256 hashes in the database, never in plain text.
- Refresh token rotation: each `/auth/refresh` call issues a new pair and revokes the old one.
- Logging out revokes the stored refresh token hash.
- Password changes revoke all refresh tokens for the user.
- Every protected route validates the JWT; the user ID is always taken from the JWT payload, never from request body parameters.

See [`docs/SECURITY.md`](docs/SECURITY.md) for full details.

---

## Financial Calculation Rules

- All monetary amounts are stored as **PostgreSQL `NUMERIC(19, 4)`** (19 significant digits, 4 decimal places).
- Prisma exposes them as `Decimal` objects; all arithmetic uses the `Decimal` library, never JavaScript `number` floating-point.
- Amounts are stored as **positive values**. The transaction `type` (INCOME / EXPENSE) determines sign during aggregation.
- **Net balance = total income − total expenses** for any date range.
- **Overall account balance** = net across all transactions ever recorded.
- Budget spending is calculated from actual expense transactions in the calendar month; it updates in real time as transactions are added.
- Each user has one **base currency** set at registration (default: USD). Changing it is blocked once transactions exist, preventing silent misinterpretation of historical amounts.

---

## Security and Privacy

- No secrets are committed; `.env` is in `.gitignore`.
- Refresh tokens stored as hashes; access tokens are short-lived and not stored server-side.
- Every database query is scoped to the authenticated user's ID from the JWT — cross-user access is structurally impossible through the API.
- Stack traces and SQL errors are never included in API error responses.
- Rate limiting on authentication endpoints (10 req / 60 s for login, 5 req / 60 s for register).
- CORS restricted to configured origins.

---

## Troubleshooting

See [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md).

**Common issues:**

| Symptom | Fix |
|---|---|
| `DATABASE_URL` error | Ensure PostgreSQL is running and the URL matches your setup |
| Port 3000 or 5173 in use | Change `PORT` in `.env` or stop the conflicting process |
| Prisma migration fails | Run `npm run db:reset` to wipe and reapply (development only) |
| `argon2` build error | Ensure Python and a C++ compiler are installed for native modules |

---

## Deployment

> **Reference only:** the guidance below documents how the system is designed to run. Deploying or operating this software requires prior written authorization under the [LICENSE](LICENSE).

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for a full production deployment guide.

Summary:
1. Set all production environment variables (strong JWT secrets, production `DATABASE_URL`).
2. Run `npm run db:migrate:prod` to apply migrations without prompts.
3. Run `npm run build` to produce `apps/api/dist` and `apps/web/dist`.
4. Serve the API with a process manager (PM2, systemd).
5. Serve the frontend build with a CDN or static server; proxy `/api/*` to the API.

---

## Contributing

This project is published for reference and portfolio evaluation and is not open to outside contributions or pull requests. See [LICENSE](LICENSE) for the use that is permitted, and contact me to request any additional permission.

## License

Copyright (c) 2026 Abdul Majeed. All rights reserved.

This project is published under a custom **Reference-Only Source-Available License**. It is **not** an open-source license. See [LICENSE](LICENSE). Deployment, commercial use, modification and redistribution require prior written authorization. Permission requests: majeed.developer0@gmail.com

## Roadmap

- [ ] Password reset via email
- [ ] Recurring transaction templates
- [ ] Multiple accounts per user (savings, checking)
- [ ] Budget roll-over month to month
- [ ] Dark mode
- [ ] Mobile app (React Native)
- [ ] Export to PDF

---

## Known Limitations

- Docker is required for the easiest PostgreSQL setup; without it, a local PostgreSQL installation is needed.
- Currency is display-only — no real exchange rate conversion.
- Changing a user's base currency is blocked once transactions exist.
- CSV export does not include a `Bearer` token in the download link; it relies on the browser session. In production, the export endpoint should be protected by an expiring signed URL or a short-lived download token.
- CI (`github-actions`) requires a PostgreSQL service container for integration tests, which are not yet implemented. Unit tests run without a database.
