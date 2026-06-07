# Docker Guide for DodoStays API

This document explains how to build and run the DodoStays API backend using Docker.

## Image Architecture

The Dockerfile uses a **multi-stage build**:
- **Build stage**: `mcr.microsoft.com/dotnet/sdk:9.0-alpine` (~250 MB) compiles the application
- **Runtime stage**: `mcr.microsoft.com/dotnet/aspnet:9.0-alpine` (~110 MB) runs the compiled app
- **Target image size**: <200 MB (typically ~180 MB with dependencies)

The runtime image includes:
- ASP.NET Core 9 runtime
- Non-root user (`dodostays` UID 1001) for security
- Health check endpoint monitoring (`/health/live`)
- Pre-created wwwroot subdirectories for file storage

## Building the Image

From the `api/` directory:

```bash
cd api
docker build -t dodostays-api:dev .
```

Build time: ~2-3 minutes on a typical machine (first build; subsequent builds are faster due to layer caching).

## Running the Container

### Development (quick start)

```bash
docker run --rm -p 5080:8080 \
  -e ConnectionStrings__Postgres="Host=host.docker.internal;Port=5432;Database=dodostays;Username=dodostays;Password=dev_only_change_me" \
  -e Jwt__SigningKey="dev-secret-change-in-production-min-32-chars" \
  -e Jwt__Issuer="https://dodostays.mu" \
  -e Jwt__Audience="https://dodostays.mu" \
  -e Cors__AllowedOrigins__0="http://localhost:3000" \
  dodostays-api:dev
```

Access the API at `http://localhost:5080`.

### Production (with volumes and persistent data)

```bash
docker run -d --name dodostays-api \
  -p 8080:8080 \
  -v /data/dodostays/photos:/app/wwwroot/photos \
  -v /data/dodostays/invoices:/app/wwwroot/invoices \
  -v /data/dodostays/emails:/app/wwwroot/emails \
  -v /data/dodostays/sms:/app/wwwroot/sms \
  -e ConnectionStrings__Postgres="Host=postgres;Port=5432;Database=dodostays;Username=dodostays;Password=CHANGE_ME" \
  -e Jwt__SigningKey="CHANGE_ME_MIN_32_CHARS" \
  -e Jwt__Issuer="https://dodostays.mu" \
  -e Jwt__Audience="https://dodostays.mu" \
  -e Cors__AllowedOrigins__0="https://dodostays.mu" \
  --restart unless-stopped \
  dodostays-api:latest
```

**Note**: In production, use docker-compose (see root `docker-compose.yml`) to orchestrate the API, database, and other services.

## Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ConnectionStrings__Postgres` | PostgreSQL connection string with NetTopologySuite support | `Host=postgres;Port=5432;Database=dodostays;Username=dodostays;Password=SECRET` |
| `Jwt__SigningKey` | JWT signing secret (min 32 characters) | `your-secure-random-string-min-32-chars` |
| `Jwt__Issuer` | JWT issuer claim | `https://dodostays.mu` |
| `Jwt__Audience` | JWT audience claim | `https://dodostays.mu` |
| `Cors__AllowedOrigins__0` | Allowed CORS origin (frontend URL) | `https://dodostays.mu` |

Optional variables:
- `ASPNETCORE_ENVIRONMENT`: Defaults to `Production` in the Dockerfile
- `Serilog__*`: Override logging configuration
- `Hangfire__*`: Configure Hangfire dashboard/storage

## Volume Mounts (Production)

The following directories **must** be mounted as volumes in production to persist user-generated content:

| Container Path | Purpose | Owner |
|----------------|---------|-------|
| `/app/wwwroot/photos` | Property photos uploaded by hosts | dodostays (UID 1001) |
| `/app/wwwroot/invoices` | Generated invoice PDFs | dodostays (UID 1001) |
| `/app/wwwroot/emails` | Dev/test email logs (LogEmailSender) | dodostays (UID 1001) |
| `/app/wwwroot/sms` | Dev/test SMS logs (LogSmsSender) | dodostays (UID 1001) |

**Important**: Ensure host directories have write permissions for UID 1001 (the `dodostays` user in the container).

```bash
# On the host (Linux)
sudo mkdir -p /data/dodostays/{photos,invoices,emails,sms}
sudo chown -R 1001:1001 /data/dodostays
```

## Health Checks

The container includes a built-in health check:
- **Endpoint**: `GET /health/live`
- **Interval**: 30 seconds
- **Timeout**: 5 seconds
- **Start period**: 20 seconds (allows EF migrations to complete)
- **Retries**: 3

Docker will mark the container as `healthy` once the endpoint returns HTTP 200.

Check health status:
```bash
docker inspect --format='{{.State.Health.Status}}' dodostays-api
```

## Troubleshooting

### Container fails to start
1. Check logs: `docker logs dodostays-api`
2. Verify database connectivity: ensure PostgreSQL is reachable from the container
3. Verify required env vars are set (especially `ConnectionStrings__Postgres`)

### "Permission denied" errors
- Ensure host volume directories are writable by UID 1001 (the non-root `dodostays` user)

### Alpine compatibility concerns
- **Npgsql**: Fully compatible with alpine (tested)
- **NetTopologySuite**: Fully compatible with alpine (tested)
- **QuestPDF**: Fully compatible with alpine (tested)
- **Native dependencies**: If future dependencies require glibc, switch base image to `mcr.microsoft.com/dotnet/aspnet:9.0` (Debian-based, ~210 MB)

## Image Size Targets

- SDK build stage: ~250 MB (not in final image)
- Runtime base: ~110 MB
- Published app + dependencies: ~70 MB
- **Total final image**: ~180 MB (well under 200 MB target)

Verify image size:
```bash
docker images dodostays-api:dev
```

## Next Steps

- For orchestrated deployment, see `docker-compose.yml` in the repository root
- For CI/CD pipeline integration, tag images with Git commit SHA: `dodostays-api:sha-abc1234`
- For production deployment, use a secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.) for sensitive env vars
