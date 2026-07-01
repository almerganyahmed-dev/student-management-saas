import { useEffect, useMemo, useState } from "react"
import { Stamp } from "../components/IndexCard"
import { useAuth } from "../lib/AuthContext"
import { api, ApiError } from "../lib/api"

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")

const inputClass =
  "mt-1 w-full border-b-2 border-pencil-light/50 bg-transparent py-1 text-sm text-slate outline-none focus-visible:border-fountain"
const labelClass = "font-mono text-xs tracking-wider text-pencil uppercase"

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
  const activeLetters = useMemo(
    () => new Set(students.map((s) => s.last_name[0]?.toUpperCase()).filter(Boolean)),
    [students],
  )

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
      <Stamp tone="pencil">Roster</Stamp>
      <h1 className="mt-3 font-display text-2xl font-semibold text-slate">Students</h1>
      <p className="mt-1 text-sm text-pencil">{students.length} enrolled</p>

      {canManage && (
        <form onSubmit={handleCreate} className="mt-6 flex flex-wrap items-end gap-4 border-b border-pencil-light/30 pb-6">
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
            className="bg-marker px-4 py-2 text-sm font-semibold tracking-wide text-chalk uppercase shadow-[3px_3px_0_0_rgba(38,51,44,0.25)] transition hover:bg-marker-dark disabled:opacity-60"
          >
            {submitting ? "Adding…" : "Add student"}
          </button>
          {formError && <p className="w-full text-xs font-semibold text-marker">{formError}</p>}
        </form>
      )}

      {error && <p className="mt-6 text-sm font-semibold text-marker">{error}</p>}
      {loading ? (
        <p className="mt-6 text-sm text-pencil">Loading…</p>
      ) : (
        <div className="mt-6 flex gap-6">
          <div className="hidden shrink-0 flex-col font-mono text-xs text-pencil-light sm:flex">
            {ALPHABET.map((letter) => (
              <span key={letter} className={activeLetters.has(letter) ? "font-semibold text-fountain" : ""}>
                {letter}
              </span>
            ))}
          </div>

          <table className="w-full border-t border-pencil-light/30 text-left text-sm">
            <thead>
              <tr className="font-mono text-xs tracking-wider text-pencil uppercase">
                <th className="py-2 font-medium">Name</th>
                <th className="py-2 font-medium">Class</th>
                {canDelete && <th className="py-2 font-medium" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-pencil-light/20">
              {sorted.map((s, i) => (
                <tr key={s.id} className={i % 2 === 1 ? "bg-chalk-dark/60" : ""}>
                  <td className="py-2 pr-4 text-slate">
                    {s.last_name}, {s.first_name}
                  </td>
                  <td className="py-2 pr-4 text-pencil">{classNameById[s.class_id] ?? "Unassigned"}</td>
                  {canDelete && (
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(s.id)}
                        className="text-xs text-pencil hover:text-marker"
                      >
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-pencil">
                    No students yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
