import { useEffect, useState } from "react"
import IndexCard, { Stamp } from "../components/IndexCard"
import { api, ApiError } from "../lib/api"

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [students, classes, todayAttendance] = await Promise.all([
          api.get("/students"),
          api.get("/classes"),
          api.get(`/attendance?date=${todayIso()}`),
        ])
        const present = todayAttendance.filter((a) => a.status === "present").length
        setStats({
          students: students.length,
          classes: classes.length,
          attendanceRate: todayAttendance.length ? `${Math.round((present / todayAttendance.length) * 100)}%` : "—",
        })
      } catch (err) {
        setError(err instanceof ApiError ? err.detail : "Could not load dashboard data.")
      }
    }
    load()
  }, [])

  const cards = [
    { label: "Students enrolled", value: stats?.students ?? "…" },
    { label: "Classes in session", value: stats?.classes ?? "…" },
    { label: "Attendance today", value: stats?.attendanceRate ?? "…" },
  ]

  return (
    <div>
      <Stamp tone="pencil">Today</Stamp>
      <h1 className="mt-3 font-display text-2xl font-semibold text-slate">Dashboard</h1>
      <p className="mt-1 text-sm text-pencil">Live counts from your school's records.</p>

      {error && <p className="mt-4 text-sm font-semibold text-marker">{error}</p>}

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {cards.map((s) => (
          <IndexCard key={s.label} className="p-4">
            <p className="font-mono text-2xl font-semibold text-slate">{s.value}</p>
            <p className="mt-1 text-xs text-pencil">{s.label}</p>
          </IndexCard>
        ))}
      </div>
    </div>
  )
}
