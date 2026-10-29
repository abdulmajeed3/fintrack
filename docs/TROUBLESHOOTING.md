# Troubleshooting

## Database Connection Failures

**Symptom:** `Error: Can't reach database server at localhost:5432`

**Fix:**
- If using Docker: `docker-compose up -d` and wait for the health check to pass.
- If using local PostgreSQL: ensure the service is running (`pg_isready -U fintrack`).
- Verify `DATABASE_URL` in `.env` matches the user, password, host, port, and database name.

## Port Already in Use

**Symptom:** `address already in use :::3000` or `address already in use :::5173`

**Fix:**
- Find and kill the process: `npx kill-port 3000` or `npx kill-port 5173`.
- Or change `PORT` in `.env` (API) or the `server.port` in `apps/web/vite.config.ts` (frontend).

## Prisma Migration Errors

**Symptom:** `The migration ... failed to apply cleanly`

**Fix (development only):**
```bash
npm run db:reset
```
This drops and re-creates the development database, then re-applies all migrations and re-runs seeds.

**Do not use `db:reset` on a production database.**

## Argon2 Build Failure

**Symptom:** `node-gyp build error` when installing argon2

**Fix:**
- Windows: Install the Visual Studio Build Tools and Python 3.
  ```powershell
  npm install -g windows-build-tools
  ```
- Linux/macOS: Ensure `build-essential` (Linux) or Xcode Command Line Tools (macOS) are installed.

## `import.meta.env` Not Recognized

**Symptom:** TypeScript error in frontend — `Property 'env' does not exist on type 'ImportMeta'`

**Fix:** Ensure `src/vite-env.d.ts` contains `/// <reference types="vite/client" />`.

## Authentication Errors

**Symptom:** `401 Unauthorized` on protected endpoints

**Fix:**
- Ensure the `Authorization: Bearer <token>` header is present and the token has not expired.
- Access tokens expire after 15 minutes. Use the refresh endpoint to get a new one.
- If the refresh token is also expired or invalid, log in again.

## Build Failures

**Symptom:** `vite build` fails with a CSS error

**Fix:** Ensure no Tailwind CSS classes that do not exist in your config are used with `@apply`. Remove or replace invalid class references in `globals.css`.

**Symptom:** `nest build` reports TypeScript errors

**Fix:** Run `npm run typecheck --workspace=apps/api` to see all type errors, then fix them. Never use `// @ts-ignore` to suppress errors.

## Seeding Fails

**Symptom:** `Seed failed: Unique constraint failed`

**Fix:** The seed is idempotent — it should be safe to run multiple times. If it fails due to a unique constraint, check whether the database was partially seeded and run `npm run db:reset` in development to start fresh.
