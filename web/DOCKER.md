# Docker Deployment Guide

This guide covers building and running the DodoStays frontend as a production Docker container.

## Prerequisites

- Docker installed (20.10+ recommended)
- Docker Compose (if deploying with backend services)

## Building the Image

### Basic Build

```bash
cd web
docker build -t dodostays-web:dev .
```

### Build with Custom API URL

For staging or production, specify the backend API URL at build time:

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.dodostays.com \
  -t dodostays-web:prod .
```

### Build with Mapbox Token

If you need map features, include your Mapbox token:

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.dodostays.com \
  --build-arg NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1... \
  -t dodostays-web:prod .
```

## Running the Container

### Standalone Mode

```bash
docker run --rm -p 3000:3000 dodostays-web:dev
```

The application will be available at http://localhost:3000

### With Environment Variables

While `NEXT_PUBLIC_*` variables are baked at build time, you can still pass server-side environment variables at runtime:

```bash
docker run --rm -p 3000:3000 \
  -e NODE_ENV=production \
  dodostays-web:prod
```

## Architecture Details

### Standalone Output Mode

This Dockerfile uses Next.js's **standalone output mode** (`output: 'standalone'` in `next.config.ts`), which:

- Creates a minimal server.js with only required dependencies
- Reduces final image size from ~1GB to **~150-200MB**
- Improves cold start time and deployment speed
- Automatically excludes devDependencies and unused files

### Multi-Stage Build

The Dockerfile uses three stages:

1. **deps**: Installs production dependencies with npm ci
2. **build**: Compiles the Next.js application
3. **runner**: Creates minimal runtime image with only built assets

### Build-Time vs Runtime Environment Variables

**Build-Time (baked into JS bundle):**
- `NEXT_PUBLIC_API_BASE_URL` — Backend API endpoint
- `NEXT_PUBLIC_MAPBOX_TOKEN` — Mapbox API token

These must be set via `--build-arg` and cannot be changed after the image is built.

**Runtime (can be changed per container):**
- `NODE_ENV` — Already set to `production` in Dockerfile
- `PORT` — Already set to `3000` (change requires rebuilding)

## Image Size Target

- **Target**: <200 MB
- **Typical**: 150-180 MB (depends on dependencies)
- **Without standalone**: 800MB-1.2GB

Use `docker images dodostays-web:dev` to verify your image size.

## Health Check

The container includes a health check that:
- Runs every 30 seconds
- Waits 20 seconds before first check (start period)
- Fails after 3 consecutive failures
- Uses wget to probe http://localhost:3000/

## Security

- Runs as non-root user `nextjs:nodejs` (UID 1001, GID 1001)
- Minimal Alpine Linux base image
- No shell utilities beyond what's required for the health check

## Troubleshooting

### Build Fails with Peer Dependency Warnings

This is expected. MUI v6 has peer dependency mismatches that require `--legacy-peer-deps`. The Dockerfile already handles this in the `npm ci` command.

### Image Size Too Large

Ensure `output: 'standalone'` is set in `next.config.ts`. Without it, Next.js copies the entire `node_modules` directory.

### Cannot Connect to Backend

Remember that `NEXT_PUBLIC_API_BASE_URL` is **baked at build time**. Rebuild the image with the correct `--build-arg` for your environment.
