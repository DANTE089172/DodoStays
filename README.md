# DodoStays

Mauritius short-term rental marketplace. See [docs/specs/](docs/specs/) for the design spec.

## Local development

```bash
docker compose up -d                  # Postgres + PostGIS
cd api && dotnet run --project src/Dodostays.Api
cd web && npm install && npm run dev
```

API: http://localhost:5080
Web: http://localhost:3000

## Deployment

Production deployment to Fly.io (Singapore region). See **[docs/DEPLOY.md](docs/DEPLOY.md)** for setup, operations, and troubleshooting.

## Project layout

- `api/` — ASP.NET Core 9 modular monolith
- `web/` — Next.js 15 PWA
- `docs/specs/` — design specs
- `docs/plans/` — implementation plans
- `docs/DEPLOY.md` — deployment runbook
- `infra/` — deployment scripts
