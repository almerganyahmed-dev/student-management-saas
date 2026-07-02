# Dedicated Billing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move billing out of the cramped Admin page into its own `/billing` page with a real plan-comparison layout, admin-only, surfacing all subscription fields the backend already returns.

**Architecture:** Pure frontend change. Lift the existing `subscription`/`billingError`/`billingBusy` state and `loadSubscription`/`handleUpgrade`/`handleManageBilling` handlers verbatim out of `Admin.jsx` into a new `Billing.jsx` page. Add a static `PLANS` array (name/price/features) for the comparison grid — this data isn't in the backend, so it's local frontend copy. No backend or schema changes.

**Tech Stack:** React 19, react-router-dom 7, Tailwind v4 (existing `@theme` tokens in `src/index.css`), existing `Card`/`Badge` components, `api`/`ApiError` from `src/lib/api.js`.

## Global Constraints

- No backend changes — consume `/billing/subscription`, `/billing/checkout-session`, `/billing/portal-session` exactly as they exist today.
- Billing nav item and `/billing` route are admin-only (`ProtectedRoute roles={['admin']}`), matching the existing `/admin` pattern.
- No new dependencies — use existing `Card`, `Badge`, icon components, and `Intl.DateTimeFormat` (native, no date library).
- Follow the project's existing convention of not unit-testing page components (only `Login.test.jsx` and `ProtectedRoute.test.jsx` exist, both auth-critical) — verify this feature by lint, build, the existing test suite staying green, and a manual browser check instead of new test files.

---

### Task 1: Add the credit-card nav icon

**Files:**
- Modify: `frontend/src/components/icons.jsx`

**Interfaces:**
- Produces: `IconCard(props)` — a React component rendering an `<svg>`, same shape as the other icons in this file (accepts `className` via the shared `Icon` wrapper).

- [ ] **Step 1: Add the `IconCard` export**

Append to the end of `frontend/src/components/icons.jsx`:

```jsx
export function IconCard(props) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
    </Icon>
  )
}
```

- [ ] **Step 2: Verify it renders with no lint errors**

Run: `cd frontend && npm run lint`
Expected: no errors reported for `icons.jsx`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/icons.jsx
git commit -m "Add credit-card icon for billing nav"
```

---

### Task 2: Create the Billing page

**Files:**
- Create: `frontend/src/pages/Billing.jsx`

**Interfaces:**
- Consumes: `Card`, `Badge` from `../components/Card`; `IconCheck` from `../components/icons` (already exists); `api`, `ApiError` from `../lib/api`; `useSearchParams` from `react-router-dom`.
- Consumes backend shape (from `backend/app/schemas/billing.py::SubscriptionOut`): `{ id, tenant_id, plan: "free"|"basic"|"premium"|"enterprise", status: "active"|"past_due"|"canceled"|"incomplete", current_period_end: string|null }`.
- Produces: `export default function Billing()` — consumed by `App.jsx` in Task 3.

- [ ] **Step 1: Write the full page component**

Create `frontend/src/pages/Billing.jsx`:

```jsx
import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import Card, { Badge } from "../components/Card"
import { IconCheck } from "../components/icons"
import { api, ApiError } from "../lib/api"

const PLAN_LABEL = { free: "Free", basic: "Basic", premium: "Premium", enterprise: "Enterprise" }
const STATUS_TONE = { active: "brand", past_due: "warning", canceled: "danger", incomplete: "neutral" }

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with the basics.",
    features: ["Up to 50 students", "1 admin seat", "Community support"],
  },
  {
    id: "basic",
    name: "Basic",
    price: "$9",
    period: "/mo",
    description: "For small schools getting organized.",
    features: ["Up to 300 students", "5 staff seats", "Attendance & grades", "Email support"],
  },
  {
    id: "premium",
    name: "Premium",
    price: "$29",
    period: "/mo",
    description: "For growing schools that need more.",
    features: ["Up to 1,500 students", "Unlimited staff seats", "Advanced reporting", "Priority email support"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$99",
    period: "/mo",
    description: "For multi-campus districts.",
    features: ["Unlimited students", "Unlimited staff seats", "Dedicated support", "Custom onboarding"],
  },
]

function formatRenewalDate(isoString) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(isoString)
  )
}

export default function Billing() {
  const [searchParams] = useSearchParams()
  const [subscription, setSubscription] = useState(null)
  const [billingError, setBillingError] = useState(null)
  const [billingBusy, setBillingBusy] = useState(null)

  async function loadSubscription() {
    try {
      setSubscription(await api.get("/billing/subscription"))
    } catch (err) {
      setBillingError(err instanceof ApiError ? err.detail : "Could not load billing status.")
    }
  }

  useEffect(() => {
    loadSubscription()
  }, [])

  async function handleUpgrade(plan) {
    setBillingError(null)
    setBillingBusy(plan)
    try {
      const { url } = await api.post("/billing/checkout-session", { plan })
      window.location.href = url
    } catch (err) {
      setBillingError(err instanceof ApiError ? err.detail : "Could not start checkout.")
      setBillingBusy(null)
    }
  }

  async function handleManageBilling() {
    setBillingError(null)
    setBillingBusy("portal")
    try {
      const { url } = await api.post("/billing/portal-session")
      window.location.href = url
    } catch (err) {
      setBillingError(err instanceof ApiError ? err.detail : "Could not open billing portal.")
      setBillingBusy(null)
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Billing</h1>
      <p className="mt-1 text-sm text-subtle">Your plan, usage limits, and payment details.</p>

      {searchParams.get("checkout") === "success" && (
        <p className="mt-4 rounded-lg bg-brand-soft px-3 py-2 text-sm font-medium text-brand-dark">
          Checkout complete — your plan will update shortly.
        </p>
      )}
      {searchParams.get("checkout") === "cancel" && (
        <p className="mt-4 rounded-lg bg-canvas px-3 py-2 text-sm font-medium text-subtle">Checkout canceled.</p>
      )}

      <Card className="mt-6 max-w-md p-6">
        {subscription ? (
          <>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-display text-lg font-semibold text-ink">{PLAN_LABEL[subscription.plan]} plan</p>
                {subscription.status === "active" && subscription.current_period_end && (
                  <p className="mt-1 text-sm text-subtle">
                    Renews {formatRenewalDate(subscription.current_period_end)}
                  </p>
                )}
              </div>
              <Badge tone={STATUS_TONE[subscription.status] ?? "neutral"}>{subscription.status}</Badge>
            </div>

            {subscription.status === "past_due" && (
              <p className="mt-4 rounded-lg bg-warning-soft px-3 py-2 text-sm font-medium text-warning">
                Your last payment failed — update your payment method to avoid losing access.
              </p>
            )}

            {subscription.plan !== "free" && (
              <button
                type="button"
                onClick={handleManageBilling}
                disabled={billingBusy !== null}
                className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition hover:border-brand hover:text-brand disabled:opacity-60"
              >
                {billingBusy === "portal" ? "Redirecting…" : "Manage billing"}
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-subtle">Loading…</p>
        )}
      </Card>

      {billingError && (
        <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger">{billingError}</p>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const isCurrent = subscription?.plan === plan.id
          return (
            <Card key={plan.id} className={`flex flex-col p-5 ${isCurrent ? "border-brand ring-2 ring-brand-soft" : ""}`}>
              <p className="font-display text-base font-semibold text-ink">{plan.name}</p>
              <p className="mt-2">
                <span className="font-display text-2xl font-semibold text-ink">{plan.price}</span>
                <span className="text-sm text-subtle"> {plan.period}</span>
              </p>
              <p className="mt-2 text-sm text-subtle">{plan.description}</p>

              <ul className="mt-4 flex-1 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-ink">
                    <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    {feature}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button type="button" disabled className="mt-5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-subtle">
                  Current plan
                </button>
              ) : plan.id === "free" ? (
                <div className="mt-5 h-[38px]" />
              ) : (
                <button
                  type="button"
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={billingBusy !== null || !subscription}
                  className="mt-5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
                >
                  {billingBusy === plan.id ? "Redirecting…" : `Choose ${plan.name}`}
                </button>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify no lint errors**

Run: `cd frontend && npm run lint`
Expected: no errors reported for `Billing.jsx`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Billing.jsx
git commit -m "Add dedicated Billing page with plan comparison grid"
```

---

### Task 3: Wire the route and nav item

**Files:**
- Modify: `frontend/src/App.jsx`

**Interfaces:**
- Consumes: `Billing` default export from Task 2 (`../pages/Billing` → `./pages/Billing` relative to `App.jsx`); `IconCard` from Task 1.

- [ ] **Step 1: Add the `Billing` import and `IconCard` import**

In `frontend/src/App.jsx`, replace:

```jsx
import Admin from './pages/Admin'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { IconGrid, IconUsers, IconUser, IconShield, IconSignOut } from './components/icons'
```

with:

```jsx
import Admin from './pages/Admin'
import Billing from './pages/Billing'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { IconGrid, IconUsers, IconUser, IconShield, IconCard, IconSignOut } from './components/icons'
```

- [ ] **Step 2: Add the nav item**

Replace:

```jsx
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: IconGrid },
    { to: '/students', label: 'Students', icon: IconUsers },
    { to: '/profile', label: 'Profile', icon: IconUser },
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin', icon: IconShield }] : []),
  ]
```

with:

```jsx
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: IconGrid },
    { to: '/students', label: 'Students', icon: IconUsers },
    { to: '/profile', label: 'Profile', icon: IconUser },
    ...(user?.role === 'admin'
      ? [
          { to: '/admin', label: 'Admin', icon: IconShield },
          { to: '/billing', label: 'Billing', icon: IconCard },
        ]
      : []),
  ]
```

- [ ] **Step 3: Add the route**

Replace:

```jsx
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <Layout>
                  <Admin />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Login />} />
```

with:

```jsx
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <Layout>
                  <Admin />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing"
            element={
              <ProtectedRoute roles={['admin']}>
                <Layout>
                  <Billing />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Login />} />
```

- [ ] **Step 4: Verify lint and existing tests still pass**

Run: `cd frontend && npm run lint && npm test`
Expected: lint clean; existing suite (`ProtectedRoute.test.jsx`, `Login.test.jsx`, `api.test.js`) still passes — this task doesn't touch their behavior.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "Wire /billing route and admin-only nav item"
```

---

### Task 4: Remove the billing section from Admin.jsx

**Files:**
- Modify: `frontend/src/pages/Admin.jsx`

**Interfaces:**
- None produced — this task only deletes now-duplicated code. `Admin.jsx` keeps the tenant record card and staff/student management, both unchanged.

- [ ] **Step 1: Drop the now-unused `useSearchParams` import**

Replace:

```jsx
import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import Card, { Badge } from "../components/Card"
import { useAuth } from "../lib/AuthContext"
import { api, ApiError } from "../lib/api"
```

with:

```jsx
import { useEffect, useState } from "react"
import Card, { Badge } from "../components/Card"
import { useAuth } from "../lib/AuthContext"
import { api, ApiError } from "../lib/api"
```

- [ ] **Step 2: Drop the billing-only constants**

Replace:

```jsx
const inputClass =
  "mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-soft"
const labelClass = "text-sm font-medium text-ink"
const ROLE_LABEL = { admin: "Administrator", teacher: "Teacher", student: "Student" }
const PLAN_LABEL = { free: "Free", basic: "Basic", premium: "Premium", enterprise: "Enterprise" }
const STATUS_TONE = { active: "brand", past_due: "warning", canceled: "danger", incomplete: "neutral" }
const UPGRADE_PLANS = ["basic", "premium", "enterprise"]
```

with:

```jsx
const inputClass =
  "mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-soft"
const labelClass = "text-sm font-medium text-ink"
const ROLE_LABEL = { admin: "Administrator", teacher: "Teacher", student: "Student" }
```

- [ ] **Step 3: Drop the billing state and handlers**

Replace:

```jsx
export default function Admin() {
  const { tenant } = useAuth()
  const [searchParams] = useSearchParams()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [subscription, setSubscription] = useState(null)
  const [billingError, setBillingError] = useState(null)
  const [billingBusy, setBillingBusy] = useState(null)

  async function loadSubscription() {
    try {
      setSubscription(await api.get("/billing/subscription"))
    } catch (err) {
      setBillingError(err instanceof ApiError ? err.detail : "Could not load billing status.")
    }
  }

  useEffect(() => {
    loadSubscription()
  }, [])

  async function handleUpgrade(plan) {
    setBillingError(null)
    setBillingBusy(plan)
    try {
      const { url } = await api.post("/billing/checkout-session", { plan })
      window.location.href = url
    } catch (err) {
      setBillingError(err instanceof ApiError ? err.detail : "Could not start checkout.")
      setBillingBusy(null)
    }
  }

  async function handleManageBilling() {
    setBillingError(null)
    setBillingBusy("portal")
    try {
      const { url } = await api.post("/billing/portal-session")
      window.location.href = url
    } catch (err) {
      setBillingError(err instanceof ApiError ? err.detail : "Could not open billing portal.")
      setBillingBusy(null)
    }
  }

  const [fullName, setFullName] = useState("")
```

with:

```jsx
export default function Admin() {
  const { tenant } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [fullName, setFullName] = useState("")
```

- [ ] **Step 4: Drop the billing JSX section**

Replace:

```jsx
      {searchParams.get("checkout") === "success" && (
        <p className="mt-4 rounded-lg bg-brand-soft px-3 py-2 text-sm font-medium text-brand-dark">
          Checkout complete — your plan will update shortly.
        </p>
      )}
      {searchParams.get("checkout") === "cancel" && (
        <p className="mt-4 rounded-lg bg-canvas px-3 py-2 text-sm font-medium text-subtle">Checkout canceled.</p>
      )}

      <h2 className="mt-8 font-display text-lg font-semibold text-ink">Billing</h2>
      <Card className="mt-4 max-w-md p-6">
        {subscription ? (
          <>
            <div className="flex items-start justify-between">
              <p className="font-display text-lg font-semibold text-ink">{PLAN_LABEL[subscription.plan]} plan</p>
              <Badge tone={STATUS_TONE[subscription.status] ?? "neutral"}>{subscription.status}</Badge>
            </div>
            <div className="mt-4 flex flex-wrap gap-2.5">
              {UPGRADE_PLANS.filter((plan) => plan !== subscription.plan).map((plan) => (
                <button
                  key={plan}
                  type="button"
                  onClick={() => handleUpgrade(plan)}
                  disabled={billingBusy !== null}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink transition hover:border-brand hover:text-brand disabled:opacity-60"
                >
                  {billingBusy === plan ? "Redirecting…" : `Choose ${PLAN_LABEL[plan]}`}
                </button>
              ))}
              {subscription.plan !== "free" && (
                <button
                  type="button"
                  onClick={handleManageBilling}
                  disabled={billingBusy !== null}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-subtle underline decoration-border transition hover:text-ink disabled:opacity-60"
                >
                  {billingBusy === "portal" ? "Redirecting…" : "Manage billing"}
                </button>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-subtle">Loading…</p>
        )}
        {billingError && (
          <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger">{billingError}</p>
        )}
      </Card>

      <h2 className="mt-8 font-display text-lg font-semibold text-ink">Staff &amp; students</h2>
```

with:

```jsx
      <h2 className="mt-8 font-display text-lg font-semibold text-ink">Staff &amp; students</h2>
```

- [ ] **Step 5: Verify lint and existing tests still pass**

Run: `cd frontend && npm run lint && npm test`
Expected: lint clean; existing suite still passes.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Admin.jsx
git commit -m "Remove billing section from Admin page (moved to /billing)"
```

---

### Task 5: End-to-end verification

**Files:** none (verification only)

**Interfaces:** none

- [ ] **Step 1: Production build succeeds**

Run: `cd frontend && npm run build`
Expected: build completes with no errors (confirms no unused-import or JSX errors slipped past lint).

- [ ] **Step 2: Manual smoke check in the running app**

The dev containers (`docker compose up`) hot-reload from the mounted `frontend/` volume, so no rebuild is needed. With the app running at `http://localhost:5173`:

1. Log in as an admin user (register a school via `/register` if you don't have one).
2. Confirm the sidebar now shows a "Billing" item (with the card icon) alongside "Admin", and that logging in as a non-admin (teacher/student) does NOT show it.
3. Click "Billing" → confirm the current plan card shows the plan name, status badge, and (if `STRIPE_SECRET_KEY` is configured and a subscription is active) a "Renews {date}" line.
4. Confirm the 4-card plan grid renders, the current plan's card has the highlighted border and a disabled "Current plan" button, and other paid tiers show "Choose {plan}" buttons.
5. Confirm the Admin page (`/admin`) no longer shows any billing content — only tenant record + staff/student management.

- [ ] **Step 3: Confirm no regressions in the existing suite**

Run: `cd frontend && npm test`
Expected: all existing tests pass (this plan added no new test files, per the spec's testing section — page components aren't unit-tested in this codebase today).
