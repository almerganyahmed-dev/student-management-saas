import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import Profile from './pages/Profile'
import Admin from './pages/Admin'
import Billing from './pages/Billing'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { IconGrid, IconUsers, IconUser, IconShield, IconCard, IconSignOut } from './components/icons'

function Layout({ children }) {
  const { user, tenant, logout } = useAuth()
  const navigate = useNavigate()
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: IconGrid },
    { to: '/students', label: 'Students', icon: IconUsers },
    { to: '/profile', label: 'Profile', icon: IconUser },
    ...(user?.role === 'admin'
      ? [
          { to: '/admin', label: 'Admin', icon: IconShield },
          { to: '/billing', label: 'Billing', icon: IconCard },
        ]
      : []),
  ]

  function handleSignOut() {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-canvas md:flex">
      <aside className="border-b border-border bg-surface md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-b-0 md:border-r">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand font-display text-sm font-bold text-white">
            {(tenant?.name ?? '?')[0]}
          </div>
          <span className="truncate font-display text-sm font-semibold text-ink">{tenant?.name ?? 'Loading…'}</span>
        </div>

        <nav className="flex flex-1 flex-wrap gap-1 px-3 pb-3 md:flex-col md:flex-nowrap md:overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-brand-soft text-brand-dark' : 'text-subtle hover:bg-canvas hover:text-ink'
                }`
              }
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border px-3 py-3">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-subtle transition hover:bg-canvas hover:text-ink"
          >
            <IconSignOut />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 px-6 py-8 md:px-10 md:py-10">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/students"
            element={
              <ProtectedRoute>
                <Layout>
                  <Students />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <Layout>
                  <Admin />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing"
            element={
              <ProtectedRoute roles={['admin']}>
                <Layout>
                  <Billing />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Login />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
