import Card, { Badge } from "../components/Card"
import { useAuth } from "../lib/AuthContext"

function initials(fullName) {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("")
}

const ROLE_LABEL = { admin: "Administrator", teacher: "Teacher", student: "Student" }

export default function Profile() {
  const { user, tenant } = useAuth()
  if (!user) return null

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Profile</h1>
      <p className="mt-1 text-sm text-subtle">Your account details.</p>

      <Card className="mt-6 max-w-sm p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand font-display text-lg font-semibold text-white">
            {initials(user.full_name)}
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-ink">{user.full_name}</p>
            <div className="mt-1">
              <Badge tone="brand">{ROLE_LABEL[user.role] ?? user.role}</Badge>
            </div>
          </div>
        </div>
        <dl className="mt-5 space-y-3 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-subtle">Email</dt>
            <dd className="text-ink">{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-subtle">School</dt>
            <dd className="font-mono text-ink">{tenant?.name ?? "—"}</dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}
