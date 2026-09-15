# DodoStays Deployment Guide

Production deployment to Fly.io (Singapore region for optimal Mauritius latency).

## Prerequisites

1. **Install flyctl CLI**:
   ```bash
   curl -L https://fly.io/install.sh | sh
   # Windows (PowerShell): iwr https://fly.io/install.ps1 -useb | iex
   ```

2. **Fly.io account**:
   ```bash
   flyctl auth signup  # or flyctl auth login if you have an account
   ```

3. **GitHub secrets** (for CD workflow):
   - Generate: `flyctl auth token`
   - Add as `FLY_API_TOKEN` in repository Settings → Secrets and variables → Actions

## First-time setup (one-off, ~15-20 minutes)

### 1. Create Postgres database

```bash
flyctl postgres create \
  --name dodostays-db \
  --region sin \
  --vm-size shared-cpu-1x \
  --volume-size 10 \
  --initial-cluster-size 1
```

**Save the credentials output** — you'll need them to build the connection string.

### 2. Initialize API app

```bash
cd api

# Create the app (uses fly.toml config)
flyctl launch --no-deploy --copy-config

# Attach Postgres (creates DATABASE_URL secret automatically)
flyctl postgres attach dodostays-db --app dodostays-api
```

After attach, Fly sets `DATABASE_URL` in the format:
```
postgres://username:password@dodostays-db.flycast:5432/dodostays_api
```

Convert this to the .NET format and set as a secret:
```bash
flyctl secrets set --app dodostays-api \
  "ConnectionStrings__Postgres=Host=dodostays-db.flycast;Port=5432;Database=dodostays_api;Username=<username>;Password=<password>;SSL Mode=Disable"
```

### 3. Set API secrets

```bash
# JWT configuration
flyctl secrets set --app dodostays-api \
  Jwt__SigningKey="$(openssl rand -hex 32)" \
  Jwt__Issuer="dodostays" \
  Jwt__Audience="dodostays"

# iCal feed signing
flyctl secrets set --app dodostays-api \
  Ical__SigningKey="$(openssl rand -hex 32)" \
  Ical__FeedBaseUrl="https://dodostays-api.fly.dev"

# Claude API (optional — InMemory NL parser works without it)
# flyctl secrets set --app dodostays-api NlParser__AnthropicApiKey="sk-ant-..."
```

### 4. Create persistent volume for API

```bash
flyctl volumes create dodostays_api_data \
  --region sin \
  --size 5 \
  --app dodostays-api
```

This volume mounts at `/data` and persists photos, emails, and SMS logs across deploys.

**Note on invoices**: Currently stored at `/app/wwwroot/invoices` (ephemeral). They survive rolling deploys but not machine replacement. To persist invoices long-term:
- Option A: Refactor `LocalDiskInvoicePdfStorage` to read output path from config (preferred)
- Option B: Add a startup command to symlink `/app/wwwroot` → `/data/wwwroot`

### 5. Deploy API (first time)

```bash
cd api
flyctl deploy --remote-only
```

**First deploy will fail** because migrations haven't run. Connect to the machine and run them manually:

```bash
flyctl ssh console --app dodostays-api

# Inside the container:
cd /app
dotnet ef database update --project Dodostays.Api.dll
exit
```

Alternatively, run migrations from your local machine:
```bash
# Set connection string (replace with your actual credentials)
export ConnectionStrings__Postgres="Host=dodostays-db.flycast;Port=5432;Database=dodostays_api;Username=...;Password=...;SSL Mode=Disable"

# Proxy to Fly Postgres
flyctl proxy 5432:5432 -a dodostays-db &
PROXY_PID=$!

# Run migrations
cd api
dotnet ef database update --project src/Dodostays.Api

# Stop proxy
kill $PROXY_PID
```

After migrations succeed, restart the API:
```bash
flyctl apps restart dodostays-api
```

### 6. Initialize Web app

```bash
cd web

# Create the app (uses fly.toml config)
flyctl launch --no-deploy --copy-config
```

### 7. Deploy Web (first time)

```bash
cd web
flyctl deploy --remote-only
```

### 8. Verify deployments

```bash
# API health check
curl https://dodostays-api.fly.dev/health/live
# Expected: HTTP 200, body "Healthy"

# Web home page
curl -I https://dodostays-web.fly.dev/
# Expected: HTTP 200

# API docs (development only, disabled in production by default)
curl https://dodostays-api.fly.dev/swagger/index.html
```

## Continuous deployment

After initial setup, every push to `master` triggers `.github/workflows/deploy.yml`:

1. Waits for CI tests to pass (`backend-test`, `frontend-typecheck-lint`)
2. Deploys API if `api/**` changed
3. Deploys Web if `web/**` changed
4. Runs smoke tests (health check endpoints)

**Manual deploys**:
```bash
# Trigger via GitHub UI: Actions → Deploy to Fly.io → Run workflow

# Or deploy locally:
cd api && flyctl deploy --remote-only
cd web && flyctl deploy --remote-only
```

## Custom domain setup

When ready to use `dodostays.com`:

### 1. Add TLS certificates

```bash
flyctl certs create dodostays.com --app dodostays-web
flyctl certs create www.dodostays.com --app dodostays-web
flyctl certs create api.dodostays.com --app dodostays-api
```

### 2. Configure DNS

Get IP addresses:
```bash
flyctl ips list --app dodostays-web
flyctl ips list --app dodostays-api
```

Add DNS records:
```
A      dodostays.com        → <web IPv4>
AAAA   dodostays.com        → <web IPv6>
CNAME  www.dodostays.com    → dodostays.com
A      api.dodostays.com    → <api IPv4>
AAAA   api.dodostays.com    → <api IPv6>
```

### 3. Update configuration

**API** (`api/fly.toml`):
```toml
[env]
  PhotoStorage__PublicBaseUrl = "https://api.dodostays.com/photos"
  Ical__FeedBaseUrl = "https://api.dodostays.com"
  Cors__AllowedOrigins__0 = "https://dodostays.com"
  Cors__AllowedOrigins__1 = "https://www.dodostays.com"
```

**Web** (`web/fly.toml`):
```toml
[build.args]
  NEXT_PUBLIC_API_BASE_URL = "https://api.dodostays.com"
```

Redeploy both apps after config changes.

## Cloudflare

DodoStays uses Cloudflare in two independent roles: **R2** for durable object storage (invoice
PDFs and listing photos), and optionally the Cloudflare **edge** (CDN + WAF + DNS) in front of the
Fly.io apps.

### Cloudflare R2 storage (durable invoices + photos)

By default the API stores invoice PDFs and photos on the Fly volume, which does **not** survive
machine replacement. R2 (S3-compatible) makes them durable.

1. **Create buckets** (Cloudflare dashboard → R2 → Create bucket): e.g. `dodostays-invoices`
   (keep private) and `dodostays-photos` (attach a public r2.dev or custom domain).

2. **Create an R2 API token** (R2 → Manage API Tokens) with Object Read & Write on those buckets.
   Note the Access Key ID, Secret Access Key, and your Account ID.

3. **Set the secrets** on the API app:
   ```bash
   flyctl secrets set --app dodostays-api \
     Invoicing__R2AccountId="<account-id>" \
     Invoicing__R2AccessKeyId="<access-key-id>" \
     Invoicing__R2SecretAccessKey="<secret-access-key>" \
     Invoicing__R2Bucket="dodostays-invoices" \
     PhotoStorage__R2AccountId="<account-id>" \
     PhotoStorage__R2AccessKeyId="<access-key-id>" \
     PhotoStorage__R2SecretAccessKey="<secret-access-key>" \
     PhotoStorage__R2Bucket="dodostays-photos"
   ```

4. **Enable the R2 providers** in `api/fly.toml` (`[env]`) and redeploy:
   ```toml
   Invoicing__StorageProvider  = "R2"
   PhotoStorage__Provider      = "R2"
   PhotoStorage__PublicBaseUrl = "https://<your-photos-public-domain>"
   ```

The R2 code path is verified in CI by `R2InvoicePdfStorageTests`, which round-trips a PDF through a
MinIO container (MinIO and R2 are both S3-compatible, so a green test means the provider stores and
reads back correctly). Invoices are read back through the API (`/api/bookings/{id}/invoice`), so the
invoice bucket stays private; only the photo bucket is public.

### Cloudflare edge (CDN + WAF + DNS) — optional

Front the Fly.io apps with Cloudflare for CDN caching, DDoS protection, and WAF rate limiting (the
spec's 10 req/s search and 1 req/min booking limits).

1. Add the domain to Cloudflare and point its nameservers at Cloudflare.
2. Create **proxied** (orange-cloud) DNS records to the Fly apps, and keep the Fly certs
   (`flyctl certs create …`) so origin TLS stays valid — use SSL mode **Full (strict)**:
   ```
   CNAME  dodostays.com   → dodostays-web.fly.dev   (proxied)
   CNAME  www             → dodostays-web.fly.dev   (proxied)
   CNAME  api             → dodostays-api.fly.dev   (proxied)
   ```
3. **Cache**: allow Cloudflare to cache Next.js static assets (`/_next/static/*`, images); add a
   cache-bypass rule for `/api/*`.
4. **WAF / rate limiting**: add rate-limit rules for `/api/search*` and `/api/bookings*`.
5. **Real client IP**: behind Cloudflare the client IP arrives in `CF-Connecting-IP` /
   `X-Forwarded-For`. Any IP-based limiting must read the forwarded header (configure ASP.NET
   `ForwardedHeaders`, trusting only Cloudflare's published IP ranges) — otherwise every request
   appears to originate from Cloudflare.

> R2 and the edge role are independent: you can enable R2 storage now and add the CDN/WAF layer
> later, or vice-versa.

## Database operations

### Run migrations

Migrations are **not** automatically applied on deploy. The API doesn't run `Database.Migrate()` on startup (to avoid race conditions with multiple instances).

**Option A — via SSH**:
```bash
flyctl ssh console --app dodostays-api
cd /app
dotnet ef database update --project Dodostays.Api.dll
exit
```

**Option B — via proxy** (from local machine):
```bash
flyctl proxy 5432:5432 -a dodostays-db &
PROXY_PID=$!

cd api
export ConnectionStrings__Postgres="Host=localhost;Port=5432;Database=dodostays_api;Username=...;Password=...;SSL Mode=Disable"
dotnet ef database update --project src/Dodostays.Api

kill $PROXY_PID
```

**Option C — add release_command** (future improvement):
Modify `api/fly.toml` to add:
```toml
[deploy]
  release_command = "sh -c 'dotnet ef database update --project Dodostays.Api.dll'"
```
This runs migrations automatically before each deploy. Requires adding EF Core tools to the runtime image.

### Connect to Postgres

```bash
flyctl postgres connect --app dodostays-db
```

Or with `psql` via proxy:
```bash
flyctl proxy 5432:5432 -a dodostays-db
psql "postgresql://username:password@localhost:5432/dodostays_api"
```

### Backups

Fly Postgres includes:
- **Automatic daily snapshots** (5-day retention)
- **Point-in-time recovery** (PITR) for 7 days on paid plans

View backups:
```bash
flyctl postgres backup list --app dodostays-db
```

Manual backup:
```bash
flyctl postgres backup create --app dodostays-db
```

Restore from backup:
```bash
# WARNING: This replaces the entire database
flyctl postgres backup restore <backup-id> --app dodostays-db
```

## Operations

### View logs

```bash
# Real-time logs
flyctl logs --app dodostays-api -f
flyctl logs --app dodostays-web -f

# Last 200 lines
flyctl logs --app dodostays-api
```

### Check app status

```bash
flyctl status --app dodostays-api
flyctl status --app dodostays-web
```

### Scale machines

```bash
# Scale up to 2 instances (for high availability)
flyctl scale count 2 --app dodostays-api

# Scale down to 1
flyctl scale count 1 --app dodostays-api

# Change VM size
flyctl scale vm shared-cpu-2x --app dodostays-api
flyctl scale memory 1024 --app dodostays-api
```

### Restart apps

```bash
flyctl apps restart dodostays-api
flyctl apps restart dodostays-web
```

### Access Hangfire dashboard

If `Hangfire__DashboardEnabled=true`:
```
https://dodostays-api.fly.dev/jobs
```

**Security**: The dashboard has no authentication by default. For production:
1. Set `Hangfire__DashboardEnabled=false` in `fly.toml`
2. Add basic auth or IP allowlist in `BookingsModule.cs` → `UseHangfireDashboardIfEnabled()`

### SSH into machines

```bash
flyctl ssh console --app dodostays-api
flyctl ssh console --app dodostays-web
```

## Rollback

If a deploy breaks production:

### 1. View releases

```bash
flyctl releases --app dodostays-api
flyctl releases --app dodostays-web
```

### 2. Rollback to previous version

```bash
# Get the image digest from the last good release
flyctl releases --app dodostays-api

# Deploy that specific image
flyctl deploy --image registry.fly.io/dodostays-api:deployment-<id> --app dodostays-api
```

**Note**: Rollback doesn't undo database migrations. If a migration is destructive, you'll need to manually revert it:
```bash
flyctl ssh console --app dodostays-api
cd /app
dotnet ef migrations remove --project Dodostays.Api.dll  # Only works if migration hasn't been applied
# Or manually write a revert SQL script
```

## Troubleshooting

### API won't start (health check fails)

1. **Check logs**:
   ```bash
   flyctl logs --app dodostays-api
   ```

2. **Common issues**:
   - Missing `ConnectionStrings__Postgres` secret
   - Postgres not attached or unreachable
   - Migrations not run (check for EF Core errors)
   - Volume not mounted (check `/data` exists)

3. **Connect to machine**:
   ```bash
   flyctl ssh console --app dodostays-api
   env | grep ConnectionStrings  # Check secrets are set
   ls -la /data                   # Check volume is mounted
   ```

### Database connection errors

1. **Verify Postgres is running**:
   ```bash
   flyctl status --app dodostays-db
   ```

2. **Check connection string format**:
   ```bash
   flyctl secrets list --app dodostays-api
   ```
   Should show `ConnectionStrings__Postgres` (with double underscores).

3. **Test connection from API machine**:
   ```bash
   flyctl ssh console --app dodostays-api
   apt-get update && apt-get install -y postgresql-client
   psql "$ConnectionStrings__Postgres"
   ```

### Web app shows API errors

1. **Check CORS configuration** in `api/fly.toml`:
   ```toml
   Cors__AllowedOrigins__0 = "https://dodostays-web.fly.dev"
   ```

2. **Check API base URL** in `web/fly.toml`:
   ```toml
   [build.args]
     NEXT_PUBLIC_API_BASE_URL = "https://dodostays-api.fly.dev"
   ```

3. **Verify API is reachable**:
   ```bash
   curl https://dodostays-api.fly.dev/health/live
   ```

### App scaled to zero, slow first request

By default, `min_machines_running = 0` saves costs but adds 3-5s cold start latency.

**Fix**: Keep 1 machine always running:
```bash
flyctl scale count 1 --min-machines-running 1 --app dodostays-api
```

Or edit `fly.toml`:
```toml
[http_service]
  min_machines_running = 1
```

### Volume full (photos/emails/SMS)

1. **Check usage**:
   ```bash
   flyctl ssh console --app dodostays-api
   df -h /data
   du -sh /data/*
   ```

2. **Extend volume**:
   ```bash
   flyctl volumes extend <volume-id> --size 10 --app dodostays-api
   ```

3. **Clean up old files** (if needed):
   ```bash
   flyctl ssh console --app dodostays-api
   find /data/emails -type f -mtime +30 -delete  # Delete emails older than 30 days
   ```

### Migrations fail on deploy

If you add a `release_command` for migrations and it fails:

1. **Check release logs**:
   ```bash
   flyctl logs --app dodostays-api
   ```

2. **Manual rollback**:
   ```bash
   flyctl ssh console --app dodostays-api
   cd /app
   dotnet ef database update <PreviousMigrationName> --project Dodostays.Api.dll
   ```

3. **Fix migration locally**, redeploy, and re-run.

## Cost estimate

Based on current configuration (shared-cpu-1x, 512MB RAM, scale-to-zero enabled):

| Resource | Configuration | Monthly cost |
|----------|---------------|--------------|
| API machine | shared-cpu-1x, 512MB, scale-to-zero | ~$1.94 (when running 24/7) or $0 (idle) |
| Web machine | shared-cpu-1x, 512MB, scale-to-zero | ~$1.94 (when running 24/7) or $0 (idle) |
| Postgres | shared-cpu-1x, 10GB volume | ~$2.00 |
| API volume | 5GB for photos/emails/SMS | ~$0.75 |
| Bandwidth | Generous free tier | ~$0 (under 100GB/mo) |
| **Total** | | **~$7-15/mo** (depending on traffic) |

Scale-to-zero saves significant costs during off-peak hours but adds 3-5s latency on the first request after idle.

**Paid features** (optional):
- High availability (2+ machines always running): +$1.94/machine
- Larger VM (shared-cpu-2x, 1GB RAM): $7.00/mo per machine
- Advanced Postgres (HA cluster, auto-scaling): $29+/mo

## Next steps

1. **Enable custom domain** (see above)
2. **Set up monitoring** (Fly provides basic metrics; consider Sentry for errors)
3. **Add release_command for migrations** (see Database operations)
4. **Persist invoices + photos** — enable Cloudflare R2 storage (see the Cloudflare section)
5. **Secure Hangfire dashboard** (add auth or disable in production)
6. **Set up staging environment** (create `dodostays-api-staging`, `dodostays-web-staging`)
7. **Configure Mapbox token** (update `NEXT_PUBLIC_MAPBOX_TOKEN` in `web/fly.toml`)
8. **Integrate real payment providers** (MIPS, Wise) when ready

## Resources

- [Fly.io Docs](https://fly.io/docs/)
- [Fly.io Postgres](https://fly.io/docs/postgres/)
- [Fly.io Volumes](https://fly.io/docs/reference/volumes/)
- [Fly.io CLI Reference](https://fly.io/docs/flyctl/)
