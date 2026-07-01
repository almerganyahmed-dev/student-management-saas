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

## Current status

Phase 1 (scaffold) complete: backend skeleton with health check and the initial DB schema (tenants, users, classes, students, attendance, subscriptions), frontend routing skeleton, Docker Compose wiring. No auth, CRUD, or billing logic yet — see the phase plan for what's next.
