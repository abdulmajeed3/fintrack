# Security

## Password Storage

Passwords are hashed with **Argon2id** (the recommended variant for password hashing):

```
type:      argon2id
memoryCost: 65536 KB  (64 MB)
timeCost:  3 iterations
parallelism: 4 lanes
```

The raw password is never stored or logged. Password verification uses `argon2.verify()` which performs a constant-time comparison.

## Token Handling

### Access Tokens (JWT)

- Signed with `JWT_ACCESS_SECRET` using the HS256 algorithm.
- Expire after 15 minutes (configurable via `JWT_ACCESS_EXPIRES_IN`).
- Sent by the client in the `Authorization: Bearer <token>` header.
- Never stored server-side; the server only verifies the signature.
- Contain only `{ sub: userId, email }` — no sensitive data.

### Refresh Tokens

- Generated as 64 random bytes (`crypto.randomBytes(64)`), returned as a hex string.
- **Only the SHA-256 hash** of the token is stored in the database (`refresh_tokens.token_hash`).
- Expire after 7 days (configurable via `JWT_REFRESH_EXPIRES_IN`).
- Rotation: each `/auth/refresh` call deletes the old hash and stores a new one — a stolen refresh token can only be used once before it is invalidated.
- All refresh tokens for a user are revoked on password change.
- The frontend stores the refresh token in `sessionStorage` (cleared when the tab closes). Access tokens are kept only in memory.

## Authorization

Every API endpoint (except `POST /auth/register` and `POST /auth/login`) is protected by `JwtAuthGuard`. The authenticated user's `sub` (UUID) is read from the verified JWT payload and used as the `userId` for all database queries.

**The userId from the request body or URL is never trusted as proof of identity.** All data access is scoped via `{ where: { userId: jwtPayload.sub } }`.

## User Data Isolation

- Every Prisma query includes the authenticated `userId` in the `where` clause.
- Category and budget ownership is verified before any transaction or budget operation.
- Cross-user access is structurally impossible through the normal API paths.

## Environment Secrets

- `.env` is listed in `.gitignore` and is never committed.
- `.env.example` contains only placeholders.
- JWT secrets should be at least 32 random characters. Generate with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
  ```

## Rate Limiting

The `ThrottlerModule` limits:
- Authentication endpoints: 10 requests per 60 seconds per IP.
- Registration: 5 requests per 60 seconds per IP.

## Logging

Error responses never include:
- Stack traces
- SQL error messages
- Password hashes
- JWT tokens
- Internal implementation details

Structured application logs use NestJS's `Logger` class and include the correlation request ID.

## Known Security Limitations

- The CSV export endpoint (`GET /reports/export/csv`) requires a valid JWT but relies on the HTTP Authorization header. Browser `<a download>` links do not send headers, so the frontend links to the URL directly. In production, this should be replaced with a short-lived signed download token.
- No CSRF protection is implemented for this project because the API uses JWT Bearer authentication (not session cookies). If cookies are used in a future version, CSRF protection will be required.
- No IP-based blocking beyond rate limiting.
- Password reset via email is not implemented.
