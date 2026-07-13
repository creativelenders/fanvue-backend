# Fanvue Platform Production Monorepo

Production-style application scaffold for the Fanvue Promotion OS.

## Structure

```text
apps/
  api/                 FastAPI backend: CRM, webhooks, agents, media, schedules
  web/                 Next.js-ready creator operations frontend shell
packages/
  search/              Extracted Fanvue unified search package
  shared-types/        Shared TypeScript contracts
  ui/                  Shared UI primitives
workers/
  crm_worker/          Churn, VIP, CRM workflow worker
  media_worker/        ComfyUI/media job worker
  scheduler/           Background scheduler process
infra/
  docker/              API/web/worker Dockerfiles
  migrations/          Database migration SQL
docs/                  Integration, operations, and security notes
```

## What is implemented

- FastAPI API with Fanvue webhook ingestion, guardrails, CRM models, media pipeline, task decomposition, skill registry, and open-model agent loop engine.
- Production app boundaries for web, API, workers, shared types, migrations, and Docker.
- Environment-driven database/API integration points so your database applications can connect everything.
- Test suite for core guardrails, skill injection, and variant branching.

## Connect your database applications

Set `DATABASE_URL` in `apps/api/.env` to your database connection string. The API uses SQLAlchemy and can target SQLite for local development or PostgreSQL in production.

For production, apply the migration in `infra/migrations/001_initial_platform.sql`, then run the API and workers.

## Validate

```bash
cd apps/api
python3 -m compileall app tests
python3 -m pytest tests -q
```

