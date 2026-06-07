# GitHub Actions CI Workflows

This directory contains the CI/CD workflows for the DodoStays project.

## Workflows

### backend-ci.yml
**Purpose**: Runs backend tests on every push and pull request to `master`.

**Triggers**:
- Push to `master` (filtered on `api/**` paths)
- Pull requests targeting `master` (filtered on `api/**` paths)

**What it does**:
- Sets up .NET 9.0.x
- Caches NuGet packages for faster builds
- Restores dependencies from `api/Dodostays.sln`
- Builds the solution in Release mode
- Runs unit tests (~136 tests, instant)
- Runs integration tests (~40 tests, ~2 min) using Testcontainers with `postgis/postgis:16-3.4`
  - Testcontainers automatically spins up a PostgreSQL+PostGIS container for testing
  - GitHub Actions runners have Docker pre-installed, so no additional setup is needed
- Uploads test results as artifacts (available for 90 days)

**Status badge**:
```markdown
![Backend CI](https://github.com/DANTE089172/DodoStays/actions/workflows/backend-ci.yml/badge.svg)
```

### frontend-ci.yml
**Purpose**: Runs frontend type checking, linting, and build verification on every push and pull request to `master`.

**Triggers**:
- Push to `master` (filtered on `web/**` paths)
- Pull requests targeting `master` (filtered on `web/**` paths)

**What it does**:

**Job 1: frontend-typecheck-lint** (parallel)
- Sets up Node.js 20.x with npm caching
- Installs dependencies with `--legacy-peer-deps`
- Runs TypeScript type checking
- Runs ESLint

**Job 2: frontend-e2e** (parallel)
- Sets up Node.js 20.x with npm caching
- Installs Playwright Chromium browser with system dependencies
- Builds the Next.js application
- **Note**: E2E test execution is deferred to Task 0.13b. The tests require a running backend API container, which will be wired in a future task. For now, we verify the build succeeds.

**Status badge**:
```markdown
![Frontend CI](https://github.com/DANTE089172/DodoStays/actions/workflows/frontend-ci.yml/badge.svg)
```

### docker-build-ci.yml
**Purpose**: Builds Docker images for both API and web services to verify they compile correctly. Images are NOT pushed to a registry in this workflow (push happens in Task 0.15).

**Triggers**:
- Push to `master` (filtered on `api/**`, `web/**` paths)
- Pull requests targeting `master`

**What it does**:

**Job 1: docker-build-api** (parallel)
- Sets up Docker Buildx
- Builds API Docker image from `api/Dockerfile`
- Tags as `dodostays-api:ci-<commit-sha>`
- Uses GitHub Actions cache for layers (faster subsequent builds)
- Does NOT push to registry

**Job 2: docker-build-web** (parallel)
- Sets up Docker Buildx
- Builds web Docker image from `web/Dockerfile`
- Passes `NEXT_PUBLIC_API_BASE_URL=http://api:8080` as build argument (dummy value for CI)
- Tags as `dodostays-web:ci-<commit-sha>`
- Uses GitHub Actions cache for layers
- Does NOT push to registry

**Note**: The Dockerfiles for `api/Dockerfile` and `web/Dockerfile` are being written by parallel agents (Tasks 0.10 and 0.11). If those tasks haven't been merged yet, this workflow will fail until the Dockerfiles are available. This is expected behavior.

**Status badge**:
```markdown
![Docker Build CI](https://github.com/DANTE089172/DodoStays/actions/workflows/docker-build-ci.yml/badge.svg)
```

## Future Work

- **Task 0.13b**: Wire backend service container in frontend-e2e job and enable Playwright E2E test execution
- **Task 0.15**: Add Docker image push to GitHub Container Registry (ghcr.io) for deployment workflows

## Adding Status Badges to Root README

Add these badges to the top of the root `README.md`:

```markdown
[![Backend CI](https://github.com/DANTE089172/DodoStays/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/DANTE089172/DodoStays/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/DANTE089172/DodoStays/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/DANTE089172/DodoStays/actions/workflows/frontend-ci.yml)
[![Docker Build CI](https://github.com/DANTE089172/DodoStays/actions/workflows/docker-build-ci.yml/badge.svg)](https://github.com/DANTE089172/DodoStays/actions/workflows/docker-build-ci.yml)
```
