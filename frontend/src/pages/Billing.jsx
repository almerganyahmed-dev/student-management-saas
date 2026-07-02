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
