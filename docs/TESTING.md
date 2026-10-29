# Testing

## Tools

| Layer | Framework |
|---|---|
| API unit tests | Jest + `@nestjs/testing` |
| Frontend unit/component tests | Vitest + React Testing Library |

## Running Tests

```bash
# All tests
npm run test

# API tests only
npm run test:api

# Frontend tests only
npm run test:web

# With coverage
cd apps/api && npx jest --coverage
cd apps/web && npx vitest run --coverage
```

## Test Environment

Unit tests run without a database. External dependencies (Prisma, JWT, config) are mocked.

**No test runs against the development or production database.** Integration tests that require a real database are noted as a future work item.

## API Test Coverage

| File | What is tested |
|---|---|
| `auth.service.spec.ts` | Registration conflict detection, login with correct/wrong credentials, Argon2id hashing, token sanitization (no passwordHash in response), ambiguous error messages |
| `transactions.service.spec.ts` | Create with valid data, zero/negative amount rejection, category type mismatch, cross-user access denial, high-precision decimal handling, income/expense/net aggregation |

## Frontend Test Coverage

| File | What is tested |
|---|---|
| `LoginPage.test.tsx` | Field rendering, email validation, password required validation, demo credentials hint, registration link |

## Known Limitations

- No integration tests against a real PostgreSQL database yet.
- No end-to-end tests (Playwright / Cypress).
- Frontend component tests rely on mocked API services.
- CSV export endpoint cannot be tested in the current unit test setup (requires a real HTTP response stream).

## Future Work

- Integration test suite with a dedicated test PostgreSQL instance (via GitHub Actions service container).
- End-to-end tests with Playwright covering critical user flows: register → add transaction → view dashboard → set budget.
