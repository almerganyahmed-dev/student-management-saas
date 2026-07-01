import IndexCard, { Stamp } from "../components/IndexCard"
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
      <Stamp tone="pencil">Staff ID</Stamp>
      <h1 className="mt-3 font-display text-2xl font-semibold text-slate">Profile</h1>
      <p className="mt-1 text-sm text-pencil">Your account details.</p>

      <IndexCard className="mt-6 max-w-sm p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center bg-slate font-display text-lg font-semibold text-chalk">
            {initials(user.full_name)}
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-slate">{user.full_name}</p>
            <p className="text-xs text-pencil">{ROLE_LABEL[user.role] ?? user.role}</p>
          </div>
        </div>
        <dl className="mt-5 space-y-2 border-t border-pencil-light/30 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-pencil">Email</dt>
            <dd className="text-slate">{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-pencil">School</dt>
            <dd className="font-mono text-slate">{tenant?.name ?? "—"}</dd>
          </div>
        </dl>
      </IndexCard>
    </div>
  )
}
