# Multi-tenancy approach

**Chosen: shared database, `tenant_id` column on every tenant-scoped table.**

## Shared DB + tenant_id (what we're building)

- One schema, one set of migrations — a single Alembic run updates every tenant at once.
- Cheap to run at small/medium scale; no per-tenant connection pool or backup job.
- Easy cross-tenant admin queries and analytics.
- Risk: a missing `WHERE tenant_id = ?` on a query is a data leak between schools. Mitigated by enforcing the filter at the query-construction layer (Phase 3), not leaving each endpoint to remember it by hand.

## DB-per-tenant (not chosen)

- Strongest isolation — a query bug can't cross tenant boundaries.
- Simple per-tenant backup, restore, and deletion (e.g. GDPR-style "delete everything for this school").
- Cost grows linearly with tenant count: N databases to migrate, monitor, and pool connections for.
- Harder to run cross-tenant analytics or admin tooling.
- Usually only worth it for large enterprise tenants or hard compliance requirements (e.g. data residency per customer).

## Revisit if

- A single enterprise customer needs data residency or contractual isolation guarantees the shared model can't offer.
- Tenant count and per-tenant data volume grow to where noisy-neighbor query load becomes a real problem.
