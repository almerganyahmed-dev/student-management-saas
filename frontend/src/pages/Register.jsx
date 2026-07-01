import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import IndexCard, { Stamp } from "../components/IndexCard"
import { useAuth } from "../lib/AuthContext"
import { ApiError } from "../lib/api"

const inputClass =
  "mt-1 w-full border-b-2 border-pencil-light/50 bg-transparent py-1 text-sm text-slate outline-none focus-visible:border-fountain"
const labelClass = "font-mono text-xs tracking-wider text-pencil uppercase"

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [tenantName, setTenantName] = useState("")
  const [tenantSlug, setTenantSlug] = useState("")
  const [slugTouched, setSlugTouched] = useState(false)
  const [adminFullName, setAdminFullName] = useState("")
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  function handleTenantNameChange(value) {
    setTenantName(value)
    if (!slugTouched) setTenantSlug(slugify(value))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await register({ tenantName, tenantSlug, adminEmail, adminPassword, adminFullName })
      navigate("/dashboard")
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Something went wrong. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <IndexCard className="w-full max-w-sm p-8">
        <Stamp tone="fountain">New school</Stamp>
        <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
          <h1 className="font-display text-2xl font-semibold text-slate">Create your school</h1>

          <label className="block">
            <span className={labelClass}>School name</span>
            <input
              type="text"
              value={tenantName}
              onChange={(e) => handleTenantNameChange(e.target.value)}
              className={inputClass}
              required
            />
          </label>

          <label className="block">
            <span className={labelClass}>School code</span>
            <input
              type="text"
              value={tenantSlug}
              onChange={(e) => {
                setSlugTouched(true)
                setTenantSlug(e.target.value)
              }}
              className={inputClass}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              title="Lowercase letters, numbers, and hyphens only"
              required
            />
          </label>

          <label className="block">
            <span className={labelClass}>Your name</span>
            <input
              type="text"
              autoComplete="name"
              value={adminFullName}
              onChange={(e) => setAdminFullName(e.target.value)}
              className={inputClass}
              required
            />
          </label>

          <label className="block">
            <span className={labelClass}>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className={inputClass}
              required
            />
          </label>

          <label className="block">
            <span className={labelClass}>Password</span>
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className={inputClass}
              required
            />
          </label>

          {error && <p className="text-xs font-semibold text-marker">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-fountain py-2 text-sm font-semibold tracking-wide text-chalk uppercase shadow-[3px_3px_0_0_rgba(38,51,44,0.25)] transition hover:brightness-110 disabled:opacity-60"
          >
            {submitting ? "Creating…" : "Create account"}
          </button>

          <p className="text-xs text-pencil">
            Already have a school?{" "}
            <Link to="/login" className="font-semibold text-fountain">
              Sign in
            </Link>
          </p>
        </form>
      </IndexCard>
    </div>
  )
}
