import { useEffect, useState } from "react"
import Card from "../components/Card"
import { IconUsers, IconGrid, IconCheck } from "../components/icons"
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
    { label: "Students enrolled", value: stats?.students ?? "…", icon: IconUsers },
    { label: "Classes in session", value: stats?.classes ?? "…", icon: IconGrid },
    { label: "Attendance today", value: stats?.attendanceRate ?? "…", icon: IconCheck },
  ]

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Dashboard</h1>
      <p className="mt-1 text-sm text-subtle">Live counts from your school's records.</p>

      {error && <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger">{error}</p>}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand-dark">
              <Icon />
            </div>
            <p className="mt-4 font-mono text-2xl font-semibold text-ink">{value}</p>
            <p className="mt-1 text-sm text-subtle">{label}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
