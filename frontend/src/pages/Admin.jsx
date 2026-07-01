import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import IndexCard, { Stamp } from "../components/IndexCard"
import { useAuth } from "../lib/AuthContext"
import { api, ApiError } from "../lib/api"

const inputClass =
  "mt-1 w-full border-b-2 border-pencil-light/50 bg-transparent py-1 text-sm text-slate outline-none focus-visible:border-fountain"
const labelClass = "font-mono text-xs tracking-wider text-pencil uppercase"
const ROLE_LABEL = { admin: "Administrator", teacher: "Teacher", student: "Student" }
const PLAN_LABEL = { free: "Free", basic: "Basic", premium: "Premium" }
const STATUS_TONE = { active: "fountain", past_due: "marker", canceled: "marker", incomplete: "pencil" }

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
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("teacher")
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function loadUsers() {
    setLoading(true)
    setError(null)
    try {
      setUsers(await api.get("/users"))
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Could not load users.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  async function handleInvite(e) {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      await api.post("/users", { full_name: fullName, email, password, role })
      setFullName("")
      setEmail("")
      setPassword("")
      setRole("teacher")
      await loadUsers()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.detail : "Could not create user.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRemove(id) {
    if (!window.confirm("Remove this user?")) return
    await api.delete(`/users/${id}`)
    await loadUsers()
  }

  return (
    <div>
      <Stamp tone="pencil">Master file</Stamp>
      <h1 className="mt-3 font-display text-2xl font-semibold text-slate">Admin</h1>
      <p className="mt-1 text-sm text-pencil">Tenant record and staff/student accounts.</p>

      <IndexCard className="mt-6 max-w-md p-6">
        <div className="flex items-start justify-between">
          <h2 className="font-display text-lg font-semibold text-slate">Tenant record</h2>
          <Stamp tone="fountain">Active</Stamp>
        </div>
        <dl className="mt-4 divide-y divide-pencil-light/30">
          <div className="flex justify-between py-2 text-sm">
            <dt className="text-pencil">Name</dt>
            <dd className="font-mono text-slate">{tenant?.name ?? "—"}</dd>
          </div>
          <div className="flex justify-between py-2 text-sm">
            <dt className="text-pencil">School code</dt>
            <dd className="font-mono text-slate">{tenant?.slug ?? "—"}</dd>
          </div>
        </dl>
      </IndexCard>

      {searchParams.get("checkout") === "success" && (
        <p className="mt-4 text-sm font-semibold text-fountain">Checkout complete — your plan will update shortly.</p>
      )}
      {searchParams.get("checkout") === "cancel" && (
        <p className="mt-4 text-sm font-semibold text-pencil">Checkout canceled.</p>
      )}

      <h2 className="mt-8 font-display text-lg font-semibold text-slate">Billing</h2>
      <IndexCard className="mt-4 max-w-md p-6">
        {subscription ? (
          <>
            <div className="flex items-start justify-between">
              <p className="font-display text-lg font-semibold text-slate">{PLAN_LABEL[subscription.plan]} plan</p>
              <Stamp tone={STATUS_TONE[subscription.status] ?? "pencil"}>{subscription.status}</Stamp>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {subscription.plan !== "basic" && (
                <button
                  type="button"
                  onClick={() => handleUpgrade("basic")}
                  disabled={billingBusy !== null}
                  className="bg-manila-dark px-4 py-2 text-xs font-semibold tracking-wide text-chalk uppercase transition hover:brightness-110 disabled:opacity-60"
                >
                  {billingBusy === "basic" ? "Redirecting…" : "Choose Basic"}
                </button>
              )}
              {subscription.plan !== "premium" && (
                <button
                  type="button"
                  onClick={() => handleUpgrade("premium")}
                  disabled={billingBusy !== null}
                  className="bg-fountain px-4 py-2 text-xs font-semibold tracking-wide text-chalk uppercase transition hover:brightness-110 disabled:opacity-60"
                >
                  {billingBusy === "premium" ? "Redirecting…" : "Choose Premium"}
                </button>
              )}
              {subscription.plan !== "free" && (
                <button
                  type="button"
                  onClick={handleManageBilling}
                  disabled={billingBusy !== null}
                  className="px-4 py-2 text-xs font-semibold tracking-wide text-pencil uppercase underline decoration-pencil-light disabled:opacity-60"
                >
                  {billingBusy === "portal" ? "Redirecting…" : "Manage billing"}
                </button>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-pencil">Loading…</p>
        )}
        {billingError && <p className="mt-3 text-xs font-semibold text-marker">{billingError}</p>}
      </IndexCard>

      <h2 className="mt-8 font-display text-lg font-semibold text-slate">Staff &amp; students</h2>

      <form onSubmit={handleInvite} className="mt-4 flex flex-wrap items-end gap-4 border-b border-pencil-light/30 pb-6">
        <label className="block">
          <span className={labelClass}>Full name</span>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} required />
        </label>
        <label className="block">
          <span className={labelClass}>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            required
          />
        </label>
        <label className="block">
          <span className={labelClass}>Temporary password</span>
          <input
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            required
          />
        </label>
        <label className="block">
          <span className={labelClass}>Role</span>
          <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="bg-marker px-4 py-2 text-sm font-semibold tracking-wide text-chalk uppercase shadow-[3px_3px_0_0_rgba(38,51,44,0.25)] transition hover:bg-marker-dark disabled:opacity-60"
        >
          {submitting ? "Adding…" : "Add account"}
        </button>
        {formError && <p className="w-full text-xs font-semibold text-marker">{formError}</p>}
      </form>

      {error && <p className="mt-4 text-sm font-semibold text-marker">{error}</p>}
      {loading ? (
        <p className="mt-4 text-sm text-pencil">Loading…</p>
      ) : (
        <table className="mt-4 w-full border-t border-pencil-light/30 text-left text-sm">
          <thead>
            <tr className="font-mono text-xs tracking-wider text-pencil uppercase">
              <th className="py-2 font-medium">Name</th>
              <th className="py-2 font-medium">Email</th>
              <th className="py-2 font-medium">Role</th>
              <th className="py-2 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-pencil-light/20">
            {users.map((u, i) => (
              <tr key={u.id} className={i % 2 === 1 ? "bg-chalk-dark/60" : ""}>
                <td className="py-2 pr-4 text-slate">{u.full_name}</td>
                <td className="py-2 pr-4 text-pencil">{u.email}</td>
                <td className="py-2 pr-4 text-pencil">{ROLE_LABEL[u.role] ?? u.role}</td>
                <td className="py-2 text-right">
                  <button type="button" onClick={() => handleRemove(u.id)} className="text-xs text-pencil hover:text-marker">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
