import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import Card from "../components/Card"
import { useAuth } from "../lib/AuthContext"
import { ApiError } from "../lib/api"

const inputClass =
  "mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-soft"
const labelClass = "text-sm font-medium text-ink"

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [tenantSlug, setTenantSlug] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login({ tenantSlug, email, password })
      navigate("/dashboard")
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Something went wrong. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand font-display text-base font-bold text-white">
            S
          </div>
          <span className="font-display text-lg font-semibold text-ink">Student SaaS</span>
        </div>

        <Card className="p-8">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <h1 className="font-display text-xl font-semibold text-ink">Sign in</h1>
              <p className="mt-1 text-sm text-subtle">Welcome back — enter your school details.</p>
            </div>

            <label className="block">
              <span className={labelClass}>School code</span>
              <input
                type="text"
                autoComplete="organization"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                className={inputClass}
                required
              />
            </label>

            <label className="block">
              <span className={labelClass}>Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                required
              />
            </label>

            <label className="block">
              <span className={labelClass}>Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                required
              />
            </label>

            {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>

            <p className="text-center text-sm text-subtle">
              New school?{" "}
              <Link to="/register" className="font-semibold text-brand hover:text-brand-dark">
                Create an account
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </div>
  )
}
