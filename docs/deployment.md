# Deployment

This app is two stateless containers (backend, frontend) plus one stateful dependency
(Postgres). The docker-compose setup is for local dev only — it runs Postgres in a
container with no backups, which is fine on a laptop and wrong in production.

## What changes for production, regardless of where you deploy

1. **Postgres must be a managed service**, not a container. Use RDS (or Cloud SQL /
   Azure Database if you're not on AWS). You lose automated backups, point-in-time
   recovery, and failover the moment Postgres runs in a container you manage yourself.
2. **Secrets never go in a Dockerfile, image, or committed `.env`.** `JWT_SECRET_KEY`,
   `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` are injected at
   container-start time from your platform's secret store (see below).
3. **`FRONTEND_URL` (backend) must be the real deployed frontend origin** — it drives
   CORS and the Stripe checkout success/cancel redirect URLs. Wrong value here means
   either CORS blocks the frontend or Stripe redirects users to `localhost`.
4. **The frontend is a static build, not the Vite dev server.** Build it with
   `frontend/Dockerfile.prod`, which compiles to static files and serves them with
   nginx. Vite bakes `VITE_API_URL` into the JS bundle **at build time** — staging and
   prod each need their own image build with their own `--build-arg VITE_API_URL=...`;
   you cannot reuse one image and swap the API URL at runtime.
5. **Migrations run as a one-off step before the new backend version goes live**, not
   automatically on container start the way local dev does it (`alembic upgrade head`
   baked into the dev command in `docker-compose.yml`). Run it explicitly as part of
   your deploy pipeline instead — running migrations automatically on every container
   start is fine solo-dev, risky once more than one backend instance can start at once.
6. **Stripe webhooks need a stable public HTTPS URL** (`https://api.yourdomain.com/webhooks/stripe`)
   registered in the Stripe dashboard, with that specific endpoint's signing secret in
   `STRIPE_WEBHOOK_SECRET`.

## Option A: AWS ECS Fargate (recommended)

No servers to patch, scales by adjusting desired task count, and matches "two
containers + a database" cleanly.

1. **RDS**: create a `db.t4g.micro`-class Postgres 16 instance (or larger), private
   subnet, security group allowing inbound 5432 only from the ECS tasks' security group.
2. **ECR**: create two repositories (`student-saas-backend`, `student-saas-frontend`),
   push images built from `backend/Dockerfile` and `frontend/Dockerfile.prod`.
3. **Secrets Manager / SSM Parameter Store**: store `JWT_SECRET_KEY`, `DATABASE_URL`,
   `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` there, reference them in the ECS task
   definition's `secrets` block (not `environment` — that would put them in plaintext
   in the task definition).
4. **ECS cluster** with two Fargate services:
   - `backend`: task def references the ECR image, port 8000, health check hitting
     `/health`, env vars for `FRONTEND_URL`, `STRIPE_PRICE_BASIC`, `STRIPE_PRICE_PREMIUM`
     (non-secret), secrets for the four above.
   - `frontend`: task def references the ECR image, port 80.
5. **Application Load Balancer**: one ALB, path-based routing — `/auth/*`, `/students`,
   `/classes`, `/attendance`, `/grades`, `/tenants/*`, `/users`, `/billing/*`,
   `/webhooks/*`, `/health` → backend target group; everything else → frontend target
   group. ACM certificate on the ALB listener for HTTPS.
6. **Migration step**: `aws ecs run-task` with the backend image and command override
   `alembic upgrade head`, run once before updating the backend service to the new
   task definition revision.

Optional optimization once this is working: since the frontend is just static files,
serving it from S3 + CloudFront instead of an ECS service is cheaper and simpler — the
ECS frontend service above is the "keep the deployment model uniform" default, not the
only option.

## Option B: single EC2 instance (cheapest, least resilient)

Reasonable for a low-traffic early launch; revisit before this matters for uptime.

1. **RDS** — same as above. Don't run Postgres in a container here either; a bad
   `docker system prune` or disk-full event on the EC2 box otherwise takes your
   database down with everything else.
2. EC2 instance (e.g. `t3.small`), security group allowing 80/443 inbound, Docker +
   docker-compose installed.
3. Copy over a production `docker-compose.yml` that uses `backend/Dockerfile` (default
   CMD, no `--reload`) and `frontend/Dockerfile.prod`, pointed at the RDS instance via
   `DATABASE_URL`, with a systemd unit (`docker-compose -f ... up`) so it restarts on
   reboot.
4. Put nginx or Caddy in front for TLS termination (Let's Encrypt), or an ALB in front
   of the single instance if you want managed cert renewal.
5. Run `docker compose run --rm backend alembic upgrade head` manually before each
   deploy that includes a migration.

## Staging vs. production

Keep these fully separate, not just different env var values pointed at shared
infrastructure:

- Separate RDS instances (a staging bug that corrupts data shouldn't touch prod data).
- Separate `JWT_SECRET_KEY` per environment — staging and prod tokens must never be
  interchangeable.
- Stripe **test mode** keys/prices for staging, **live mode** for prod — each has its
  own webhook endpoint and signing secret in the Stripe dashboard.
- Separate `FRONTEND_URL` / CORS origin per environment.

See `backend/.env.staging.example` and `backend/.env.production.example` for the
expected shape (values are placeholders, not real secrets).
