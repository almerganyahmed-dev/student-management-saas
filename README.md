# Student Management SaaS

Multi-tenant platform for schools to manage students, classes, attendance, and grades, with subscription billing.

**Stack:** React + Tailwind (Vite) · FastAPI · PostgreSQL · JWT auth · Stripe · Docker

**Multi-tenancy:** shared database, `tenant_id` column on every tenant-scoped table (row-level isolation). See [docs/multi-tenancy.md](docs/multi-tenancy.md) for the trade-offs vs. DB-per-tenant.

## Project layout

```
backend/    FastAPI app, SQLAlchemy models, Alembic migrations
frontend/   React app (Vite), routing skeleton
docs/       Design notes
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

## Current status

Phases 1–5 complete: scaffold, JWT auth + RBAC, tenant-scoped CRUD (classes/students/attendance/grades), the full frontend wired to the backend (register/login/RBAC-gated UI), and Stripe subscription billing (checkout, customer portal, webhook-driven plan sync). See the phase plan for what's next (tests, CI/CD, deployment prep).
