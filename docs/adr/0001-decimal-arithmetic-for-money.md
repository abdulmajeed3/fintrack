# ADR 0001: Use NUMERIC(19,4) and Decimal.js for monetary values

**Status:** Accepted  
**Date:** 2026-10-28

## Context

Financial applications must represent and compute monetary amounts without rounding errors. JavaScript's `number` type is IEEE 754 double-precision floating-point, which cannot represent all decimal fractions exactly. For example:

```js
0.1 + 0.2 === 0.30000000000000004 // true
```

Accumulating such errors across many transactions silently corrupts account balances and report totals.

## Decision

- **Database:** All amount columns use `NUMERIC(19,4)` (19 significant digits, 4 decimal places). PostgreSQL's `NUMERIC` type stores the exact decimal value.
- **Backend:** The Prisma client returns `NUMERIC` columns as `Prisma.Decimal`. Aggregations (`sum`, `avg`) are performed via Prisma's `aggregate` and `groupBy`, which return `Decimal` objects. All arithmetic in service code uses the `Decimal` API.
- **Frontend:** Amounts received from the API are strings. Display formatting uses `Intl.NumberFormat`. If client-side arithmetic is ever needed (e.g., a running total in a form), `Decimal.js` is used rather than `number`.
- **API boundary:** Amounts are serialised as strings in JSON responses (Prisma `Decimal` serialises to string) and accepted as strings in request bodies, validated to be parseable as a positive decimal.

## Consequences

- **Positive:** No silent rounding errors in any financial calculation.
- **Positive:** The database is the authoritative source; backend aggregations match exactly what the database computed.
- **Negative:** Slightly more verbose code (must use `new Decimal(x).plus(y)` instead of `x + y`).
- **Negative:** Frontend must treat amounts as strings or Decimal objects, never raw JS numbers.
- **Out of scope:** Currency conversion — this application stores all amounts in the user's selected currency and does not perform cross-currency arithmetic.
