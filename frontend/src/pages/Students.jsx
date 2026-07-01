import { useEffect, useMemo, useState } from "react"
import Card from "../components/Card"
import { useAuth } from "../lib/AuthContext"
import { api, ApiError } from "../lib/api"

const inputClass =
  "mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-soft"
const labelClass = "text-sm font-medium text-ink"

function initials(first, last) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase()
}

export default function Students() {
  const { user } = useAuth()
  const canManage = user?.role === "admin" || user?.role === "teacher"
  const canDelete = user?.role === "admin"

  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [classId, setClassId] = useState("")
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [studentsRes, classesRes] = await Promise.all([api.get("/students"), api.get("/classes")])
      setStudents(studentsRes)
      setClasses(classesRes)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Could not load students.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const classNameById = useMemo(() => Object.fromEntries(classes.map((c) => [c.id, c.name])), [classes])

  async function handleCreate(e) {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      await api.post("/students", {
        first_name: firstName,
        last_name: lastName,
        class_id: classId || null,
      })
      setFirstName("")
      setLastName("")
      setClassId("")
      await loadData()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.detail : "Could not add student.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Remove this student?")) return
    await api.delete(`/students/${id}`)
    await loadData()
  }

  const sorted = [...students].sort(
    (a, b) => a.last_name.localeCompare(b.last_name) || a.first_name.localeCompare(b.first_name),
  )

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Students</h1>
          <p className="mt-1 text-sm text-subtle">{students.length} enrolled</p>
        </div>
      </div>

      {canManage && (
        <Card className="mt-6 p-5">
          <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-4">
            <label className="block">
              <span className={labelClass}>First name</span>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} required />
            </label>
            <label className="block">
              <span className={labelClass}>Last name</span>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} required />
            </label>
            <label className="block">
              <span className={labelClass}>Class</span>
              <select value={classId} onChange={(e) => setClassId(e.target.value)} className={inputClass}>
                <option value="">Unassigned</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
            >
              {submitting ? "Adding…" : "Add student"}
            </button>
            {formError && <p className="w-full text-sm font-medium text-danger">{formError}</p>}
          </form>
        </Card>
      )}

      {error && <p className="mt-6 rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger">{error}</p>}

      <Card className="mt-6 overflow-hidden">
        {loading ? (
          <p className="p-6 text-sm text-subtle">Loading…</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-canvas text-xs font-medium tracking-wide text-subtle uppercase">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Class</th>
                {canDelete && <th className="px-5 py-3 font-medium" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map((s) => (
                <tr key={s.id} className="transition hover:bg-canvas">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-dark">
                        {initials(s.first_name, s.last_name)}
                      </div>
                      <span className="text-ink">
                        {s.last_name}, {s.first_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-subtle">{classNameById[s.class_id] ?? "Unassigned"}</td>
                  {canDelete && (
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(s.id)}
                        className="text-sm font-medium text-subtle hover:text-danger"
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-10 text-center text-subtle">
                    No students yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
