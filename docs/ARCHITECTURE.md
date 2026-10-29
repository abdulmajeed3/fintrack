# Architecture

## Overview

FinTrack is a two-tier web application consisting of a REST API and a single-page frontend, connected to a PostgreSQL database.

```
┌───────────────────────────────────────────────┐
│                    Browser                     │
│  React 18 SPA (Vite, TanStack Query, Tailwind) │
└───────────────────────┬───────────────────────┘
                        │  HTTP REST /api/v1
                        │  Bearer JWT
                        ▼
┌───────────────────────────────────────────────┐
│        NestJS 10 + Fastify (port 3000)         │
│                                                │
│  GlobalPipes ► ValidationPipe (whitelist)      │
│  GlobalFilters ► HttpExceptionFilter           │
│  GlobalInterceptors ► TransformInterceptor     │
│  Middleware ► RequestIdMiddleware              │
│  Throttler ► Rate limiting                     │
│                                                │
│  Modules:                                      │
│    auth · users · categories · transactions   │
│    budgets · dashboard · reports               │
└───────────────────────┬───────────────────────┘
                        │  Prisma ORM
                        ▼
┌───────────────────────────────────────────────┐
│            PostgreSQL 16 (port 5432)           │
│  Tables: users, refresh_tokens, categories,   │
│          transactions, budgets                 │
└───────────────────────────────────────────────┘
```

## Module Boundaries

| Module | Responsibility |
|---|---|
| `auth` | Registration, login, logout, token issuance and rotation |
| `users` | Profile read/update, password change, default category creation |
| `categories` | CRUD per-user categories |
| `transactions` | CRUD transactions, pagination, filtering, decimal aggregation |
| `budgets` | Monthly budget CRUD, real-time spending calculation |
| `dashboard` | Aggregated summary endpoint for the dashboard page |
| `reports` | Annual summaries, category breakdowns, CSV export |
| `database` | Global `PrismaService` provided to all modules |

## API Request Lifecycle

```
Request arrives
    │
    ├── RequestIdMiddleware          adds X-Request-Id header
    │
    ├── JwtAuthGuard                 validates Bearer token
    │   └── JwtStrategy             verifies signature, checks user exists
    │
    ├── ValidationPipe               validates and transforms DTO
    │
    ├── Controller method
    │       │
    │       └── Service method       business logic
    │               │
    │               └── PrismaService  database query
    │
    ├── TransformInterceptor         wraps response in { success, data, meta }
    │
    └── HttpExceptionFilter          formats errors as { success: false, error }
```

## Authentication Flow

```
Register / Login
    │
    ├── Hash password with Argon2id
    ├── Issue JWT access token (15m, signed with ACCESS_SECRET)
    ├── Generate random 64-byte refresh token
    ├── Store SHA-256 hash of refresh token in DB
    └── Return both tokens to client

Subsequent requests
    └── Attach access token as Authorization: Bearer <token>

Access token expires
    ├── POST /auth/refresh with refresh token
    ├── Look up hash in DB, check not expired
    ├── Delete old token, issue new pair (rotation)
    └── Return new tokens

Logout
    └── DELETE refresh token hash from DB
```

## Frontend Architecture

```
main.tsx
  └── QueryClientProvider (TanStack Query)
        └── BrowserRouter
              └── AuthProvider (auth context)
                    └── AppRouter
                          ├── Public routes (login, register)
                          └── RequireAuth
                                └── AppLayout (sidebar + main)
                                      └── Page components
                                            └── useQuery / useMutation
                                                  └── service layer
                                                        └── apiClient (Axios)
```

The frontend never calls the API directly from a page component. All API calls go through typed service modules (`services/`) which use the shared `apiClient` (Axios instance with JWT interceptors and auto-refresh).
