# Dedicated billing page

## Problem

Billing currently lives as a cramped section at the bottom of the Admin page,
squeezed between the tenant record and staff management. It shows only plan
name, status badge, and bare "Choose {plan}" buttons — no pricing, no
feature comparison, no renewal date (even though the backend already returns
`current_period_end`), and no guidance when a subscription is `past_due`.

## Goals

- Give billing its own page with room for a real plan-comparison layout.
- Surface all the subscription data the backend already exposes
  (`plan`, `status`, `current_period_end`), not just plan/status.
- Make the current tier and available upgrades scannable at a glance.
- No backend changes — consume the existing endpoints as-is.

## Non-goals

- No new backend fields, endpoints, or Stripe metadata (price/feature
  content is static frontend copy, not sourced from Stripe).
- No self-serve downgrade-to-free flow beyond what already exists
  (canceling via the Stripe portal already resets the tenant to `free`
  through the webhook).

## Design

### Routing & nav

- New route `/billing` → `frontend/src/pages/Billing.jsx`, wrapped in
  `ProtectedRoute roles={['admin']}` (same pattern as `/admin`).
- New sidebar nav item "Billing" in `App.jsx`'s `navItems`, admin-only,
  using a new `IconCard` (credit card) added to `components/icons.jsx`.
- `Admin.jsx` loses its billing section (state, handlers, JSX) entirely;
  keeps tenant record + staff/student management only.

### Page layout (top to bottom)

1. **Header** — "Billing" title + one-line subtitle.
2. **Checkout success/cancel banner** — moved verbatim from `Admin.jsx`,
   reads `?checkout=success|cancel` from `useSearchParams`.
3. **Current plan card**:
   - Plan name + status `Badge` (reuses `STATUS_TONE` mapping already in
     `Admin.jsx`).
   - Renewal date: format `current_period_end` (ISO string) as
     `"Renews {Mon D, YYYY}"` via `Intl.DateTimeFormat` when present and
     status is `active`; omit the line entirely when null (e.g. `free`
     plan has no period end).
   - `past_due` status: prominent warning callout ("Your last payment
     failed — update your payment method to avoid losing access") with a
     CTA into the Stripe portal.
   - "Manage billing" button (existing `handleManageBilling` logic),
     shown whenever `plan !== "free"`.
4. **Plan comparison grid** — responsive grid (1 col mobile → 4 cols
   desktop) of plan cards, sourced from a local `PLANS` array:
   ```js
   const PLANS = [
     { id: "free", name: "Free", price: "$0", period: "forever", description: "...", features: [...] },
     { id: "basic", name: "Basic", price: "$9", period: "/mo", description: "...", features: [...] },
     { id: "premium", name: "Premium", price: "$29", period: "/mo", description: "...", features: [...] },
     { id: "enterprise", name: "Enterprise", price: "$99", period: "/mo", description: "...", features: [...] },
   ]
   ```
   Each card:
   - Name, price + period, one-line description.
   - Feature bullets (3-4 items) with `IconCheck`.
   - CTA: "Current plan" (disabled) when `plan.id === subscription.plan`;
     otherwise "Choose {name}" wired to the existing `handleUpgrade(plan)`
     for basic/premium/enterprise. The `free` card never gets an upgrade
     button (there's no Stripe price for it — downgrading happens via the
     portal, which the webhook resolves to `free` on cancellation).
   - Current tier's card gets a highlighted border/ring (`border-brand
     ring-2 ring-brand-soft`) so it's scannable without reading text.
5. **Billing error banner** — same pattern as today, shown when a fetch
   or action fails.

### State & data flow

Straight lift of the existing `subscription`/`billingError`/`billingBusy`
state and `loadSubscription`/`handleUpgrade`/`handleManageBilling`
functions from `Admin.jsx` into `Billing.jsx`, unchanged. No new API
calls, no new schemas.

### Testing

Existing `backend/tests/test_billing.py` is untouched (no backend
changes). Frontend: no test file exists for `Admin.jsx` today, so no
existing coverage to port; this is a UI-only change and follows the
project's existing convention of not unit-testing every page component
(only `Login.test.jsx` and `ProtectedRoute.test.jsx` exist as precedent
for what gets tests — auth-critical paths). Verified manually via the
running dev app instead.
