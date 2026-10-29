# API Reference

## Base URL

```
http://localhost:3000/api/v1
```

## Swagger UI

When the API is running, interactive documentation is available at:

```
http://localhost:3000/docs
```

The Swagger UI allows you to explore all endpoints, see request/response schemas, and execute requests with your JWT token.

## Authentication

1. Register: `POST /api/v1/auth/register`
2. Login: `POST /api/v1/auth/login` — returns `accessToken` and `refreshToken`
3. Include the access token in subsequent requests:
   ```
   Authorization: Bearer <accessToken>
   ```
4. When the access token expires, call `POST /api/v1/auth/refresh` with `{ "refreshToken": "..." }`.

## Response Envelope

All responses follow this structure:

```json
// Success
{
  "success": true,
  "data": {},
  "meta": {},
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}

// Paginated list
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1, "limit": 20, "total": 45,
    "totalPages": 3, "hasNextPage": true, "hasPrevPage": false,
    "totals": { "income": "5500.00", "expense": "1814.50", "net": "3685.50" }
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": ["amount must be a positive decimal number"]
  },
  "requestId": "..."
}
```

## Endpoint Overview

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Register a new account |
| POST | `/auth/login` | Login |
| POST | `/auth/refresh` | Refresh tokens |
| POST | `/auth/logout` | Logout (revoke refresh token) |
| GET | `/auth/me` | Get current JWT payload |
| GET | `/profile` | Get full user profile |
| PATCH | `/profile` | Update name / currency |
| PUT | `/profile/password` | Change password |
| GET | `/categories` | List categories (`?type=INCOME\|EXPENSE`) |
| GET | `/categories/:id` | Get one category |
| POST | `/categories` | Create category |
| PATCH | `/categories/:id` | Update category |
| DELETE | `/categories/:id` | Delete category |
| GET | `/transactions` | List with pagination and filters |
| GET | `/transactions/:id` | Get one transaction |
| POST | `/transactions` | Create transaction |
| PATCH | `/transactions/:id` | Update transaction |
| DELETE | `/transactions/:id` | Delete transaction |
| GET | `/budgets` | List budgets (`?month=&year=`) |
| GET | `/budgets/:id` | Get one budget |
| POST | `/budgets` | Create budget |
| PATCH | `/budgets/:id` | Update budget amount |
| DELETE | `/budgets/:id` | Delete budget |
| GET | `/dashboard` | Dashboard summary (`?month=&year=`) |
| GET | `/dashboard/trend` | Monthly trend (`?months=6`) |
| GET | `/reports/monthly-summary` | Annual monthly summary (`?year=`) |
| GET | `/reports/category-breakdown` | Category breakdown (`?dateFrom=&dateTo=&type=`) |
| GET | `/reports/transactions` | Transaction report (`?dateFrom=&dateTo=&type=`) |
| GET | `/reports/export/csv` | CSV export |

## Pagination and Filtering

Paginated endpoints accept:

| Query param | Type | Default |
|---|---|---|
| `page` | integer | 1 |
| `limit` | integer (1–100) | 20 |

Transaction filtering:

| Query param | Example |
|---|---|
| `type` | `INCOME` or `EXPENSE` |
| `categoryId` | UUID |
| `dateFrom` | `2024-01-01` |
| `dateTo` | `2024-01-31` |
| `search` | `grocery` |
| `sortBy` | `date` or `amount` |
| `sortOrder` | `asc` or `desc` |

## Date and Amount Conventions

- Dates are sent and returned as `YYYY-MM-DD` strings (ISO 8601 date, no time).
- Amounts are sent and returned as decimal strings, e.g. `"123.45"`.
- Never use JavaScript `number` for monetary values — always use the string representation.
