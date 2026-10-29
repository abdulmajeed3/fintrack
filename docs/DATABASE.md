# Database

## Technology

PostgreSQL 16 via Prisma ORM. Schema defined in [`prisma/schema.prisma`](../prisma/schema.prisma).

## Monetary Representation

All monetary amounts use **PostgreSQL `NUMERIC(19, 4)`** — 19 significant digits with 4 decimal places. Prisma maps this to `Decimal` objects in TypeScript (using the `decimal.js` library internally). All financial arithmetic in the application uses `Decimal` methods, never JavaScript `number` (which is an IEEE 754 double and would introduce floating-point errors for financial data).

Amounts are always stored as **positive values**. The `type` column on each transaction (INCOME / EXPENSE) determines whether the amount contributes to income or expenses during aggregation.

## Entity Descriptions

### `users`

Central entity. Each user is isolated — all other tables reference `userId` and all queries are scoped to the authenticated user.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `email` | VARCHAR UNIQUE | Lowercased before storage |
| `name` | VARCHAR | Display name |
| `password_hash` | VARCHAR | Argon2id hash |
| `currency` | ENUM | One of: USD, CAD, GBP, PKR, EUR |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | Auto-updated |

### `refresh_tokens`

Stores the SHA-256 hash of each issued refresh token. Never stores the raw token.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `token_hash` | VARCHAR UNIQUE | SHA-256(rawToken) |
| `user_id` | UUID FK | Cascade delete |
| `expires_at` | TIMESTAMPTZ | |

### `categories`

Per-user transaction categories. Default categories are created for every new user.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID FK | Cascade delete |
| `name` | VARCHAR | |
| `type` | ENUM | INCOME or EXPENSE |
| `color` | VARCHAR | Hex color, e.g. `#f59e0b` |
| `icon` | VARCHAR | Icon identifier |
| `is_default` | BOOLEAN | True for seeded categories |

Unique constraint: `(user_id, name, type)`.

### `transactions`

Core financial records.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID FK | Cascade delete |
| `category_id` | UUID FK | Restrict delete (transaction blocks category delete) |
| `type` | ENUM | Must match category type |
| `amount` | NUMERIC(19,4) | Always positive |
| `description` | VARCHAR | |
| `transaction_date` | DATE | Calendar date only (no time component) |
| `notes` | VARCHAR | Optional |

### `budgets`

Monthly budget allocations per expense category.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID FK | Cascade delete |
| `category_id` | UUID FK | Cascade delete |
| `amount` | NUMERIC(19,4) | Monthly budget limit |
| `month` | INT | 1–12 |
| `year` | INT | e.g. 2024 |

Unique constraint: `(user_id, category_id, month, year)`.

## Indexes

```sql
-- users
UNIQUE(email)

-- categories
INDEX(user_id)
INDEX(user_id, type)
UNIQUE(user_id, name, type)

-- transactions
INDEX(user_id)
INDEX(user_id, transaction_date)
INDEX(user_id, type)
INDEX(user_id, category_id)
INDEX(user_id, transaction_date, type)

-- budgets
INDEX(user_id)
INDEX(user_id, year, month)
UNIQUE(user_id, category_id, month, year)
```

## Date Range Semantics

All date-range queries compare against the `transaction_date` column using `>=` and `<=` inclusive bounds. Monthly calculations use:

- `startDate = new Date(year, month - 1, 1)` — first day of the month
- `endDate = new Date(year, month, 0)` — last day of the month (JavaScript's `Date(year, month, 0)` trick)

## Migrations

Managed by Prisma. Each schema change creates a new migration file in `prisma/migrations/`.

```bash
# Create a new migration in development
npx prisma migrate dev --name describe_the_change

# Apply without prompts (CI / production)
npx prisma migrate deploy
```

**Never edit an already-applied migration.** If you need to change the schema, run `prisma migrate dev` to generate a new migration.

## Seeding

```bash
npm run db:seed
```

See [`prisma/seed.ts`](../prisma/seed.ts). Seeds are idempotent using `upsert` and `findFirst` guards.

## Backup

For a development database:

```bash
pg_dump -U fintrack -d fintrack_db -F c -f fintrack_backup.dump
pg_restore -U fintrack -d fintrack_db fintrack_backup.dump
```
