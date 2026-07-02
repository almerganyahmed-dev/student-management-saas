import { useEffect, useState } from "react"
import Card, { Badge } from "../components/Card"
import { useAuth } from "../lib/AuthContext"
import { api, ApiError } from "../lib/api"

const inputClass =
  "mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-soft"
const labelClass = "text-sm font-medium text-ink"
const ROLE_LABEL = { admin: "Administrator", teacher: "Teacher", student: "Student" }

export default function Admin() {
  const { tenant } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
      <h1 className="font-display text-2xl font-semibold text-ink">Admin</h1>
      <p className="mt-1 text-sm text-subtle">Tenant record and staff/student accounts.</p>

      <Card className="mt-6 max-w-md p-6">
        <div className="flex items-start justify-between">
          <h2 className="font-display text-base font-semibold text-ink">Tenant record</h2>
          <Badge tone="brand">Active</Badge>
        </div>
        <dl className="mt-4 divide-y divide-border">
          <div className="flex justify-between py-2.5 text-sm">
            <dt className="text-subtle">Name</dt>
            <dd className="font-mono text-ink">{tenant?.name ?? "—"}</dd>
          </div>
          <div className="flex justify-between py-2.5 text-sm">
            <dt className="text-subtle">School code</dt>
            <dd className="font-mono text-ink">{tenant?.slug ?? "—"}</dd>
          </div>
        </dl>
      </Card>

      <h2 className="mt-8 font-display text-lg font-semibold text-ink">Staff &amp; students</h2>

      <Card className="mt-4 p-5">
        <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-4">
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
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {submitting ? "Adding…" : "Add account"}
          </button>
          {formError && <p className="w-full text-sm font-medium text-danger">{formError}</p>}
        </form>
      </Card>

      {error && <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger">{error}</p>}

      <Card className="mt-4 overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-subtle">Loading…</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-canvas text-xs font-medium tracking-wide text-subtle uppercase">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="transition hover:bg-canvas">
                  <td className="px-5 py-3 text-ink">{u.full_name}</td>
                  <td className="px-5 py-3 text-subtle">{u.email}</td>
                  <td className="px-5 py-3">
                    <Badge tone="neutral">{ROLE_LABEL[u.role] ?? u.role}</Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemove(u.id)}
                      className="text-sm font-medium text-subtle hover:text-danger"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
