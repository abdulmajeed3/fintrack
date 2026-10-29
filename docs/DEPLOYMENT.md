# Deployment

> **Reference only:** this guide documents how the system is designed to run. Deploying or operating this software requires prior written authorization under the [LICENSE](../LICENSE).

This guide describes a manual deployment to a Linux VPS or similar environment.

## Production Environment Variables

Set these on your server (never commit them):

```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/fintrack_db
PORT=3000
JWT_ACCESS_SECRET=<64-byte random base64>
JWT_REFRESH_SECRET=<64-byte random base64>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGINS=https://your-domain.com
```

## Build

```bash
# On your build server or locally
npm install
npm run build
```

This produces:
- `apps/api/dist/` — compiled NestJS app
- `apps/web/dist/` — compiled React SPA (static files)

## PostgreSQL

Provision a PostgreSQL 14+ database. Apply migrations:

```bash
DATABASE_URL=... npx prisma migrate deploy --schema=prisma/schema.prisma
```

Do not run the seed script in production unless you specifically want demo data.

## API Deployment

Copy `apps/api/dist/` and `node_modules/` to your server. Start with a process manager:

```bash
# Using PM2
pm2 start apps/api/dist/main.js --name fintrack-api
pm2 save
```

Or use a systemd unit file.

## Frontend Deployment

The `apps/web/dist/` directory contains static files. Serve them with:

- **Nginx:** configure a root pointing to `dist/`, with `try_files $uri /index.html` for SPA routing.
- **CDN (Vercel, Netlify, Cloudflare Pages):** deploy the `dist/` directory.

Proxy `/api/*` requests to the API server.

## HTTPS

Configure HTTPS via Let's Encrypt (Certbot) or your hosting provider's SSL. The `Secure` flag on cookies and HTTPS-only access are required for secure operation.

## Health Check

The API does not expose a dedicated `/health` endpoint in the current version. Use a TCP health check on port 3000, or add a simple `GET /api/v1/health` route that returns `200 OK`.

## Backup

Schedule regular PostgreSQL backups:

```bash
pg_dump -U fintrack -d fintrack_db -F c -f /backups/fintrack_$(date +%Y%m%d).dump
```

## Rollback

1. Deploy the previous `dist/` build.
2. If the database schema changed, apply the rollback migration:
   ```bash
   npx prisma migrate resolve --rolled-back <migration_name>
   ```
   Note: Prisma does not auto-generate rollback SQL. Plan schema changes carefully for zero-downtime deployments.
