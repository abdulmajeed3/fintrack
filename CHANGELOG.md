# Changelog

All notable changes to FinTrack will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-10-28

### Added

**Authentication**
- User registration with Argon2id password hashing (65536 KB memory, 3 iterations, 4 parallelism)
- JWT access tokens (15-minute expiry) + opaque refresh tokens (7-day expiry, stored as SHA-256 hashes)
- Refresh token rotation: every use issues a new token and invalidates the old one
- All refresh tokens revoked on password change
- Rate limiting on auth endpoints

**Transactions**
- Create, read, update, and delete personal transactions
- Income and expense transaction types
- High-precision monetary amounts using PostgreSQL `NUMERIC(19,4)` and Decimal.js
- Pagination with per-page totals (income, expense, net)
- Filter by type, category, date range

**Categories**
- Custom income and expense categories per user
- Default categories created automatically on registration
- Color and icon fields for visual differentiation
- Deletion blocked while transactions reference the category

**Budgets**
- Monthly expense budgets per category
- Real-time spend tracking against actual transactions
- Over-budget and near-limit (80%) indicators
- Unique budget per user/category/month

**Dashboard**
- Month-by-month navigation
- Income, expense, and net summary cards
- 12-month income vs. expense bar chart
- Expense breakdown pie chart
- Recent transactions list
- Budget progress summary

**Reports**
- 12-month annual bar chart
- Category breakdown pie chart
- CSV export of filtered transactions

**Settings**
- Update display name and currency preference
- Change password (requires current password, rotates all refresh tokens)
- Currency change blocked once transactions exist

**Infrastructure**
- NestJS 10 + Fastify adapter
- React 18 + Vite + TanStack Query v5
- PostgreSQL 16 + Prisma ORM
- Swagger/OpenAPI documentation at `/docs`
- GitHub Actions CI (type check, test, build for both apps)
- Docker Compose for local PostgreSQL
- Idempotent seed script with demo user and sample data
- Unit tests: 17 API tests (Jest), 5 frontend tests (Vitest)

[1.0.0]: https://github.com/your-username/fintrack/releases/tag/v1.0.0
