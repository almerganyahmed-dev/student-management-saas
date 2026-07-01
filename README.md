# Student Management SaaS

Multi-tenant platform for schools to manage students, classes, attendance, and grades, with subscription billing.

**Stack:** React + Tailwind (Vite) · FastAPI · PostgreSQL · JWT auth · Stripe · Docker

**Multi-tenancy:** shared database, `tenant_id` column on every tenant-scoped table (row-level isolation). See [docs/multi-tenancy.md](docs/multi-tenancy.md) for the trade-offs vs. DB-per-tenant.

## Project layout

```
backend/    FastAPI app, SQLAlchemy models, Alembic migrations, pytest suite
frontend/   React app (Vite), pages wired to the backend, Vitest/RTL suite
docs/       Design notes and deployment guide
```

## Run locally with Docker (recommended)

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker compose up --build
```

- Backend: http://localhost:8000 (health check at `/health`, docs at `/docs`)
- Frontend: http://localhost:5173
- Postgres: localhost:5432 (user/pass `postgres`/`postgres`, db `student_saas`)

The backend container runs `alembic upgrade head` on startup, so the schema is created automatically.

## Run without Docker

**Backend**

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # point DATABASE_URL at a Postgres instance you control
alembic upgrade head
uvicorn app.main:app --reload
```

**Frontend**

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Billing (Stripe)

Billing endpoints work without any Stripe setup — they return `503 Billing is not configured` instead of crashing. To exercise real checkout:

1. Create a [Stripe](https://dashboard.stripe.com/register) account and grab your **test-mode** secret key.
2. Create two recurring Prices (Basic, Premium) in test mode and copy their Price IDs.
3. In `backend/.env`, set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PREMIUM`.
4. For webhooks locally, run `stripe listen --forward-to localhost:8000/webhooks/stripe` (Stripe CLI) and put the printed signing secret in `STRIPE_WEBHOOK_SECRET`.

Every tenant starts on the free plan automatically at signup — no Stripe interaction needed until they upgrade.

## Tests

```bash
# Backend (needs a reachable Postgres — creates its own student_saas_test database)
cd backend && pip install -r requirements-dev.txt && pytest

# Frontend
cd frontend && npm test
```

CI (`.github/workflows/ci.yml`) runs both suites plus lint and a production build on every push/PR to `main`.

## Deployment

`backend/Dockerfile` and `frontend/Dockerfile.prod` are production images (non-root backend user, static nginx-served frontend build). See [docs/deployment.md](docs/deployment.md) for the full guide — AWS ECS Fargate (recommended) and single-EC2 (cheaper, less resilient) options, secrets management, migration strategy, and staging/prod separation. `backend/.env.staging.example` and `backend/.env.production.example` show the expected env shape per environment.

## Current status

All 8 phases complete: scaffold, JWT auth + RBAC, tenant-scoped CRUD, frontend integration, Stripe billing, backend/frontend test suites, GitHub Actions CI, and deployment prep.
