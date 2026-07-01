import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import IndexCard, { Stamp } from "../components/IndexCard"
import { useAuth } from "../lib/AuthContext"
import { ApiError } from "../lib/api"

const inputClass =
  "mt-1 w-full border-b-2 border-pencil-light/50 bg-transparent py-1 text-sm text-slate outline-none focus-visible:border-fountain"
const labelClass = "font-mono text-xs tracking-wider text-pencil uppercase"

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
    <div className="flex min-h-screen items-center justify-center px-4">
      <IndexCard className="w-full max-w-sm p-8">
        <Stamp tone="pencil">Riverbend Unified · File 04</Stamp>
        <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
          <h1 className="font-display text-2xl font-semibold text-slate">Sign in</h1>

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

          {error && <p className="text-xs font-semibold text-marker">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-marker py-2 text-sm font-semibold tracking-wide text-chalk uppercase shadow-[3px_3px_0_0_rgba(38,51,44,0.25)] transition hover:bg-marker-dark disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>

          <p className="text-xs text-pencil">
            New school?{" "}
            <Link to="/register" className="font-semibold text-fountain">
              Create an account
            </Link>
          </p>
        </form>
      </IndexCard>
    </div>
  )
}
